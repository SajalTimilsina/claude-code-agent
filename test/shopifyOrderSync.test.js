'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  syncOrders,
  buildOrdersUrl,
  normalizeOrder,
  MemoryStore,
  nextLinkFromHeaders,
} = require('../shopifyOrderSync.js');

// --- helpers ---------------------------------------------------------------

/** Build a fake order object for the API response. */
function makeOrder(id, { updatedAt = '2024-08-20T12:00:00Z', financial = 'paid', fulfillment = 'unfulfilled' } = {}) {
  return {
    id,
    name: `#100${id}`,
    email: `customer${id}@example.com`,
    total_price: '99.00',
    currency: 'USD',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: updatedAt,
    financial_status: financial,
    fulfillment_status: fulfillment,
    state: 'active',
  };
}

/**
 * A mock HTTP client that returns a scripted sequence of responses per call.
 * Each entry is { orders, linkHeader?, status?, ok? }. It records every request
 * URL so tests can assert on pagination behaviour.
 */
function mockClient(pages) {
  const calls = [];
  let i = 0;
  async function client(url, init) {
    calls.push({ url, init });
    const p = pages[i] || { orders: [] };
    i += 1;
    return {
      ok: p.ok !== false,
      status: p.status || 200,
      statusText: p.statusText || 'OK',
      headers: p.linkHeader ? { get: (name) => (name.toLowerCase() === 'link' ? p.linkHeader : null) } : { get: () => null },
      json: async () => ({ orders: p.orders }),
      text: async () => p.body || '',
    };
  }
  return { client, calls };
}

// --- buildOrdersUrl --------------------------------------------------------

test('buildOrdersUrl produces the expected endpoint with defaults', () => {
  const url = buildOrdersUrl('my-shop.myshopify.com');
  assert.strictEqual(
    url,
    'https://my-shop.myshopify.com/admin/api/2024-07/orders.json?page=1&limit=50'
  );
});

test('buildOrdersUrl honours page and pageSize', () => {
  const url = buildOrdersUrl('shop.example.com', { apiVersion: '2023-10', page: 3, pageSize: 250 });
  assert.strictEqual(
    url,
    'https://shop.example.com/admin/api/2023-10/orders.json?page=3&limit=250'
  );
});

test('buildOrdersUrl caps pageSize at 250', () => {
  const url = buildOrdersUrl('shop.example.com', { pageSize: 9999 });
  assert.ok(url.endsWith('limit=250'));
});

test('buildOrdersUrl throws without a shop domain', () => {
  assert.throws(() => buildOrdersUrl(null), RangeError);
});

// --- normalizeOrder --------------------------------------------------------

test('normalizeOrder flattens a raw order', () => {
  const rec = normalizeOrder(makeOrder(1));
  assert.deepStrictEqual(rec, {
    id: 1,
    name: '#1001',
    email: 'customer1@example.com',
    status: 'paid_unfulfilled',
    totalPrice: '99.00',
    currency: 'USD',
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2024-08-20T12:00:00Z',
  });
});

test('normalizeOrder falls back to state when statuses are missing', () => {
  const rec = normalizeOrder({ id: 5, state: 'open' });
  assert.strictEqual(rec.status, 'open');
  assert.strictEqual(rec.email, null);
  assert.strictEqual(rec.totalPrice, '0.0');
});

test('normalizeOrder rejects non-order input', () => {
  assert.throws(() => normalizeOrder(null), TypeError);
  assert.throws(() => normalizeOrder({ id: 'nope' }), TypeError);
});

// --- MemoryStore -----------------------------------------------------------

test('MemoryStore tracks insert vs replace via set()', () => {
  const s = new MemoryStore();
  assert.strictEqual(s.set({ id: 1, updatedAt: 'a' }), true);   // insert
  assert.strictEqual(s.set({ id: 1, updatedAt: 'b' }), false);  // replace
  assert.strictEqual(s.size(), 1);
  assert.strictEqual(s.get(1).updatedAt, 'b');
  assert.deepStrictEqual(s.all().map((r) => r.id), [1]);
});

// --- nextLinkFromHeaders ---------------------------------------------------

test('nextLinkFromHeaders parses rel="next"', () => {
  const h = { get: (n) => (n.toLowerCase() === 'link'
    ? '<https://x/admin/api/2024-07/orders.json?page=1>; rel="prev", <https://x/admin/api/2024-07/orders.json?page=2>; rel="next"'
    : null) };
  assert.strictEqual(nextLinkFromHeaders(h), 'https://x/admin/api/2024-07/orders.json?page=2');
});

test('nextLinkFromHeaders returns null when absent', () => {
  assert.strictEqual(nextLinkFromHeaders({ get: () => null }), null);
  assert.strictEqual(nextLinkFromHeaders(undefined), null);
});

// --- syncOrders ------------------------------------------------------------

test('syncOrders inserts all orders from a single page', async () => {
  const { client, calls } = mockClient([{ orders: [makeOrder(1), makeOrder(2)] }]);
  const result = await syncOrders({ shopDomain: 's.myshopify.com', accessToken: 'tok', fetchClient: client });

  assert.strictEqual(result.fetched, 2);
  assert.strictEqual(result.inserted, 2);
  assert.strictEqual(result.updated, 0);
  assert.strictEqual(result.unchanged, 0);
  assert.strictEqual(result.store.size(), 2);
  // The access token must be sent as an admin header.
  assert.strictEqual(calls[0].init.headers['X-Shopify-Access-Token'], 'tok');
});

test('syncOrders follows pagination until there is no next link', async () => {
  const { client, calls } = mockClient([
    { orders: [makeOrder(1)], linkHeader: '<u2>; rel="next"' },
    { orders: [makeOrder(2)], linkHeader: '<u3>; rel="next"' },
    { orders: [makeOrder(3)] }, // no next link -> stop
  ]);
  const result = await syncOrders({ shopDomain: 's.myshopify.com', accessToken: 'tok', fetchClient: client });

  assert.strictEqual(result.fetched, 3);
  assert.strictEqual(result.inserted, 3);
  assert.strictEqual(calls.length, 3);
});

test('syncOrders stops after maxPages even if more links exist', async () => {
  const { client, calls } = mockClient([
    { orders: [makeOrder(1)], linkHeader: '<u2>; rel="next"' },
    { orders: [makeOrder(2)], linkHeader: '<u3>; rel="next"' },
    { orders: [makeOrder(3)], linkHeader: '<u4>; rel="next"' },
  ]);
  const result = await syncOrders({
    shopDomain: 's.myshopify.com', accessToken: 'tok', fetchClient: client, maxPages: 2,
  });
  assert.strictEqual(result.fetched, 2);
  assert.strictEqual(calls.length, 2);
});

test('syncOrders is idempotent — unchanged orders are not rewritten', async () => {
  const store = new MemoryStore();
  const pages = [{ orders: [makeOrder(1), makeOrder(2)] }];
  const first = await syncOrders({ shopDomain: 's.myshopify.com', accessToken: 't', fetchClient: mockClient(pages).client, store });
  assert.strictEqual(first.inserted, 2);

  const second = await syncOrders({ shopDomain: 's.myshopify.com', accessToken: 't', fetchClient: mockClient(pages).client, store });
  assert.strictEqual(second.unchanged, 2);
  assert.strictEqual(second.inserted, 0);
  assert.strictEqual(second.updated, 0);
  assert.strictEqual(store.size(), 2);
});

test('syncOrders updates an order whose updatedAt changed', async () => {
  const store = new MemoryStore();
  await syncOrders({
    shopDomain: 's.myshopify.com', accessToken: 't',
    fetchClient: mockClient([{ orders: [makeOrder(1, { updatedAt: 'v1' })] }]).client,
    store,
  });
  const result = await syncOrders({
    shopDomain: 's.myshopify.com', accessToken: 't',
    fetchClient: mockClient([{ orders: [makeOrder(1, { updatedAt: 'v2' })] }]).client,
    store,
  });
  assert.strictEqual(result.updated, 1);
  assert.strictEqual(store.get(1).updatedAt, 'v2');
});

test('syncOrders throws on a non-2xx response', async () => {
  const { client } = mockClient([{ orders: [], ok: false, status: 401, body: 'invalid token' }]);
  await assert.rejects(
    () => syncOrders({ shopDomain: 's.myshopify.com', accessToken: 'bad', fetchClient: client }),
    /Shopify API error 401/
  );
});

test('syncOrders requires an access token', async () => {
  await assert.rejects(
    () => syncOrders({ shopDomain: 's.myshopify.com', fetchClient: mockClient([]).client }),
    RangeError
  );
});

test('syncOrders uses a custom storage adapter when provided', async () => {
  const seen = {};
  const customStore = {
    get: (id) => seen[id],
    set: (rec) => { seen[rec.id] = rec; },
    size: () => Object.keys(seen).length,
  };
  const result = await syncOrders({
    shopDomain: 's.myshopify.com', accessToken: 't',
    fetchClient: mockClient([{ orders: [makeOrder(7)] }]).client,
    store: customStore,
  });
  assert.strictEqual(result.store, customStore);
  assert.strictEqual(seen[7].id, 7);
});
