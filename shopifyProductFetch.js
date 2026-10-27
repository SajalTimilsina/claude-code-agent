'use strict';

/**
 * Shopify product fetch — request building + response parsing.
 *
 * This module helps an integration read products from a Shopify store through
 * the Admin API. It is intentionally dependency-free (no HTTP client): it builds
 * the exact REST requests to send (single product, or a paginated list with
 * filters and field selection), and it parses/normalizes the raw JSON responses
 * into clean, predictable records. A real integration feeds the output of
 * {@link buildProductRequest} / {@link buildProductListRequest} to an HTTP
 * client and passes each response through {@link parseProducts}.
 */

// --- Shopify Admin API constraints (from the Products resource) ---

const DEFAULT_API_VERSION = '2024-07';
const MAX_PAGE_SIZE = 250; // REST `limit` upper bound for collection endpoints
const MIN_PAGE_SIZE = 1;

// Product fields that can be requested via the REST `fields` parameter.
const PRODUCT_FIELDS = [
  'id', 'title', 'handle', 'body_html', 'vendor', 'product_category',
  'product_type', 'tags', 'published', 'published_scope', 'created_at',
  'updated_at', 'price', 'price_min', 'price_max', 'available',
  'variants', 'options', 'images', 'featured_image', 'image',
];

/**
 * Build a REST request to fetch a single product by id or handle.
 *
 * @param {number|string} idOrHandle The product's numeric id or its handle.
 * @param {{shopDomain?:string, apiVersion?:string, fields?:string[]}} [opts]
 * @returns {{method:string, path:string, query:object}}
 * @throws {RangeError} if idOrHandle is empty.
 */
function buildProductRequest(idOrHandle, opts = {}) {
  if (idOrHandle === undefined || idOrHandle === null || String(idOrHandle).trim() === '') {
    throw new RangeError('A product id or handle is required');
  }
  const shopDomain = opts.shopDomain || 'my-store.myshopify.com';
  const apiVersion = opts.apiVersion || DEFAULT_API_VERSION;
  return {
    method: 'GET',
    path: `/admin/api/${apiVersion}/products/${encodeURIComponent(String(idOrHandle).trim())}.json`,
    query: buildQuery(opts),
  };
}

/**
 * Build a REST request to fetch a list of products, with optional filtering,
 * field selection, and cursor pagination.
 *
 * @param {{shopDomain?:string, apiVersion?:string, limit?:number, fields?:string[],
 *          created_at_min?:string, created_at_max?:string, updated_at_min?:string,
 *          updated_at_max?:string, title?:string, vendor?:string, product_type?:string,
 *          status?:string, published_at?:string, published_at_min?:string,
 *          published_at_max?:string, published_scope?:string, id?:number|string,
 *          ids?:Array<number|string>, title_contains?:string, handle?:string,
 *          variant_title?:string, variant_sku?:string, variant_barcode?:string,
 *          variant_option_1?:string, variant_option_2?:string, variant_option_3?:string,
 *          page?:number, after?:string, before?:string}} [opts]
 * @returns {{method:string, path:string, query:object}}
 * @throws {RangeError} if `limit` is out of range.
 */
function buildProductListRequest(opts = {}) {
  const shopDomain = opts.shopDomain || 'my-store.myshopify.com';
  const apiVersion = opts.apiVersion || DEFAULT_API_VERSION;
  const query = buildQuery(opts);

  if (query.limit !== undefined) {
    if (!Number.isInteger(query.limit) || query.limit < MIN_PAGE_SIZE || query.limit > MAX_PAGE_SIZE) {
      throw new RangeError(`limit must be an integer between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`);
    }
  }

  return {
    method: 'GET',
    path: `/admin/api/${apiVersion}/products.json`,
    query,
  };
}

/**
 * Assemble the query parameters from options, dropping undefined values and
 * serializing arrays appropriately.
 *
 * @param {object} opts Options as accepted by the request builders.
 * @returns {object} A plain object of query parameters.
 */
function buildQuery(opts = {}) {
  const q = {};

  if (opts.fields && Array.isArray(opts.fields)) {
    const fields = opts.fields.filter((f) => f);
    if (fields.length > 0) q.fields = fields.join(',');
  }

  if (opts.limit !== undefined) q.limit = opts.limit;

  // Simple pass-through scalar params.
  const passthrough = [
    'created_at_min', 'created_at_max', 'updated_at_min', 'updated_at_max',
    'title', 'vendor', 'product_type', 'status', 'published_at',
    'published_at_min', 'published_at_max', 'published_scope', 'id',
    'title_contains', 'handle', 'variant_title', 'variant_sku', 'variant_barcode',
    'variant_option_1', 'variant_option_2', 'variant_option_3', 'page',
    'after', 'before',
  ];
  for (const key of passthrough) {
    if (opts[key] !== undefined && opts[key] !== null && opts[key] !== '') {
      q[key] = opts[key];
    }
  }

  // `ids` is a comma-separated list in the REST API.
  if (Array.isArray(opts.ids) && opts.ids.length > 0) {
    q.ids = opts.ids.join(',');
  }

  return q;
}

/**
 * Parse a Shopify products-list response body into normalized product records.
 *
 * @param {object} body The decoded JSON body of a `/products.json` response,
 *   shaped like `{ products: [...], metafield ... }`. May also be a bare array.
 * @returns {object[]} An array of normalized product records (see
 *   {@link normalizeProduct}).
 * @throws {RangeError} if the body has no `products` array and is not itself an array.
 */
function parseProducts(body) {
  let raw;
  if (Array.isArray(body)) {
    raw = body;
  } else if (body && Array.isArray(body.products)) {
    raw = body.products;
  } else {
    throw new RangeError('Expected a products response with a "products" array');
  }
  return raw.map(normalizeProduct);
}

/**
 * Normalize a single raw Shopify product into a clean record.
 *
 * Extracts the commonly-needed fields, computes a convenience `priceRange`,
 * flattens variants into compact objects, and guarantees stable keys even when
 * source fields are missing.
 *
 * @param {object} p A raw Shopify product object.
 * @returns {object}
 */
function normalizeProduct(p) {
  if (!p || typeof p !== 'object') {
    throw new RangeError('Expected a product object');
  }

  const variants = Array.isArray(p.variants) ? p.variants : [];
  const images = Array.isArray(p.images) ? p.images : [];

  const priceMin = numOrNull(p.price_min);
  const priceMax = numOrNull(p.price_max);
  const price = numOrNull(p.price);

  return {
    id: p.id != null ? p.id : null,
    title: str(p.title),
    handle: str(p.handle),
    vendor: str(p.vendor),
    productType: str(p.product_type),
    tags: splitTags(p.tags),
    published: p.published === true,
    createdAt: str(p.created_at),
    updatedAt: str(p.updated_at),
    available: p.available === true,
    price,
    priceRange: { min: priceMin, max: priceMax },
    variantCount: variants.length,
    variants: variants.map((v) => ({
      id: v.id != null ? v.id : null,
      title: str(v.title),
      sku: str(v.sku),
      barcode: str(v.barcode),
      price: numOrNull(v.price),
      inventoryPolicy: str(v.inventory_policy),
      available: v.available === true,
    })),
    imageCount: images.length,
    featuredImage: images.length > 0 ? str(images[0].src) : null,
  };
}

// --- small helpers ---

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function splitTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
}

module.exports = {
  buildProductRequest,
  buildProductListRequest,
  buildQuery,
  parseProducts,
  normalizeProduct,
  // Exported for reuse/testing:
  DEFAULT_API_VERSION,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PRODUCT_FIELDS,
};

// CLI entry point: node shopifyProductFetch.js <response.json> [--list]
if (require.main === module) {
  const fs = require('fs');
  const args = process.argv.slice(2);
  const isList = args.includes('--list');
  const file = args.find((a) => !a.startsWith('--'));

  if (!file) {
    console.error('Usage: node shopifyProductFetch.js <response.json> [--list]');
    process.exit(1);
  }

  let body;
  try {
    body = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Failed to read input: ${e.message}`);
    process.exit(1);
  }

  try {
    const products = isList ? parseProducts(body) : [normalizeProduct(body)];
    for (const prod of products) {
      console.log(`${prod.id ?? '?'}  ${prod.title} (${prod.variantCount} variants)`);
      if (prod.priceRange.min != null || prod.priceRange.max != null) {
        console.log(`     price: ${prod.priceRange.min ?? '?'} - ${prod.priceRange.max ?? '?'}`);
      }
      if (prod.tags.length > 0) console.log(`     tags:  ${prod.tags.join(', ')}`);
    }
    console.log(`\nParsed ${products.length} product(s).`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
