'use strict';

/**
 * Shopify order sync engine.
 *
 * Pulls orders from the Shopify Admin REST API and upserts them into a local
 * store, so an offline copy of a shop's orders can be kept in sync without
 * re-downloading what has not changed.
 *
 * The module is dependency-free and deliberately decoupled: it takes an
 * injectable HTTP client (any function with the shape of `fetch`) and an
 * injectable storage adapter, so it can be tested without network access or a
 * real database. When no client is supplied it falls back to the global
 * `fetch`, and when no store is supplied it uses an in-memory Map.
 */

const DEFAULT_PAGE_SIZE = 50; // Shopify caps `limit` at 250 per request.
const MAX_PAGE_SIZE = 250;

/**
 * Build the URL for one page of the Shopify orders endpoint.
 *
 * @param {string} shopDomain e.g. "my-shop.myshopify.com"
 * @param {number} [page]     1-based page number.
 * @param {number} [pageSize] Number of records per page (capped at 250).
 * @returns {string} Absolute URL for GET /admin/api/<version>/orders.json
 */
function buildOrdersUrl(shopDomain, { apiVersion = '2024-07', page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new RangeError('shopDomain is required');
  }
  const size = Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE);
  return `https://${shopDomain}/admin/api/${apiVersion}/orders.json?page=${page}&limit=${size}`;
}

/**
 * Normalize a raw Shopify order object into a flat record suitable for local
 * storage. Only the fields that are stable across syncs are kept, plus the
 * `updatedAt` timestamp used to decide whether a record changed.
 *
 * @param {object} order A single element of the `orders` array from the API.
 * @returns {{id:number, name:string, email:string|null, status:string,
 *   totalPrice:string, currency:string, createdAt:string, updatedAt:string}}
 */
function normalizeOrder(order) {
  if (!order || typeof order !== 'object' || !Number.isInteger(order.id)) {
    throw new TypeError('Expected an order object with an integer id');
  }
  return {
    id: order.id,
    name: order.name || null,
    email: order.email || null,
    status: order.financial_status && order.fulfillment_status
      ? `${order.financial_status}_${order.fulfillment_status}`
      : (order.state || 'unknown'),
    totalPrice: String(order.total_price ?? '0.0'),
    currency: order.currency || 'USD',
    createdAt: order.created_at || null,
    updatedAt: order.updated_at || null,
  };
}

/**
 * In-memory storage adapter backed by a Map keyed on order id.
 * Satisfies the same interface as any user-supplied store.
 */
class MemoryStore {
  constructor() {
    this._orders = new Map();
  }
  /** @returns {object|undefined} the stored record, if any */
  get(id) {
    return this._orders.get(id);
  }
  /** Insert or replace a record. Returns true if it was added, false if replaced. */
  set(record) {
    const isNew = !this._orders.has(record.id);
    this._orders.set(record.id, record);
    return isNew;
  }
  /** @returns {number} number of stored records */
  size() {
    return this._orders.size;
  }
  /** @returns {Array<object>} all stored records, sorted by id ascending */
  all() {
    return [...this._orders.values()].sort((a, b) => a.id - b.id);
  }
  clear() {
    this._orders.clear();
  }
}

/**
 * Fetch every order from Shopify, following the `Link: rel="next"` header
 * until there are no more pages, and upsert each normalized order into the
 * store. Orders whose `updatedAt` is unchanged are skipped (not rewritten),
 * which keeps the operation idempotent.
 *
 * @param {object} options
 * @param {string} options.shopDomain          e.g. "my-shop.myshopify.com"
 * @param {string} options.accessToken         Shopify admin access token.
 * @param {(url:string, init?:object)=>Promise<Response>} [options.fetchClient]
 *   Injectable HTTP client; defaults to global `fetch`.
 * @param {object} [options.store]             Storage adapter; defaults to a fresh MemoryStore.
 * @param {number} [options.pageSize]          Records per page (default 50, max 250).
 * @param {number} [options.apiVersion]        Admin API version (default "2024-07").
 * @param {number} [options.maxPages]          Safety cap on pages fetched (default Infinity).
 * @returns {Promise<{fetched:number, inserted:number, updated:number, unchanged:number, store:object}>}
 * @throws {Error} if the API returns a non-2xx response.
 */
async function syncOrders({
  shopDomain,
  accessToken,
  fetchClient,
  store,
  pageSize = DEFAULT_PAGE_SIZE,
  apiVersion = '2024-07',
  maxPages = Infinity,
} = {}) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new RangeError('accessToken is required');
  }
  const client = fetchClient || (typeof fetch === 'function' ? fetch : undefined);
  if (!client) {
    throw new RangeError('No HTTP client available; pass options.fetchClient or use Node >= 18');
  }
  const target = store || new MemoryStore();

  let page = 1;
  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  while (true) {
    const url = buildOrdersUrl(shopDomain, { apiVersion, page, pageSize });
    const res = await client(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await safeReadBody(res);
      throw new Error(`Shopify API error ${res.status}: ${body || res.statusText}`);
    }

    const data = await res.json();
    const orders = Array.isArray(data.orders) ? data.orders : [];
    fetched += orders.length;

    for (const raw of orders) {
      const rec = normalizeOrder(raw);
      const existing = target.get(rec.id);
      if (!existing) {
        target.set(rec);
        inserted += 1;
      } else if (existing.updatedAt !== rec.updatedAt) {
        target.set(rec);
        updated += 1;
      } else {
        unchanged += 1;
      }
    }

    // Stop when we have a full page but no next link, or hit the safety cap.
    if (page >= maxPages) break;
    const nextUrl = nextLinkFromHeaders(res.headers);
    if (!nextUrl || orders.length === 0) break;
    page += 1;
  }

  return { fetched, inserted, updated, unchanged, store: target };
}

/** Extract the `rel="next"` URL from a `Link` header value, if present. */
function nextLinkFromHeaders(headers) {
  const link = readHeader(headers, 'link');
  if (!link) return null;
  // Link: <https://...>, <https://...>; rel="next"
  const match = /<([^>]+)>;\s*rel=["']?next["']?/.exec(link);
  return match ? match[1] : null;
}

/** Read a header case-insensitively from either a Headers-like object or a plain object. */
function readHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    return headers.get(name);
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) return headers[key];
  }
  return undefined;
}

/** Read a response body as text, tolerating clients that lack `.text()`. */
async function safeReadBody(res) {
  try {
    if (typeof res.text === 'function') return await res.text();
    if (typeof res.body === 'string') return res.body;
  } catch {
    // ignore — fall through to empty string
  }
  return '';
}

module.exports = {
  syncOrders,
  buildOrdersUrl,
  normalizeOrder,
  MemoryStore,
  nextLinkFromHeaders,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
};

// CLI entry point: node shopifyOrderSync.js <shop-domain> <access-token> [--pages N]
if (require.main === module) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const shopDomain = args[0];
  const accessToken = args[1];
  if (!shopDomain || !accessToken) {
    console.error('Usage: node shopifyOrderSync.js <shop-domain> <access-token> [--pages N]');
    process.exit(1);
  }

  (async () => {
    try {
      const result = await syncOrders({
        shopDomain,
        accessToken,
        maxPages: flag('--pages') ? Number(flag('--pages')) : Infinity,
      });
      console.log(`Fetched ${result.fetched} order(s):`);
      console.log(`  inserted:  ${result.inserted}`);
      console.log(`  updated:   ${result.updated}`);
      console.log(`  unchanged: ${result.unchanged}`);
      console.log(`  stored:    ${result.store.size()}`);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  })();
}
