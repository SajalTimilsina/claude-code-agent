'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  buildProductRequest,
  buildProductListRequest,
  buildQuery,
  parseProducts,
  normalizeProduct,
  MAX_PAGE_SIZE,
} = require('../shopifyProductFetch.js');

// --- buildProductRequest (single) ---

test('builds a GET request for a product by numeric id', () => {
  const req = buildProductRequest(12345);
  assert.strictEqual(req.method, 'GET');
  assert.strictEqual(req.path, '/admin/api/2024-07/products/12345.json');
  assert.deepStrictEqual(req.query, {});
});

test('builds a GET request for a product by handle', () => {
  const req = buildProductRequest('my-handle');
  assert.strictEqual(req.path, '/admin/api/2024-07/products/my-handle.json');
});

test('URL-encodes handles with special characters', () => {
  const req = buildProductRequest('a b/c');
  assert.ok(req.path.includes(encodeURIComponent('a b/c')));
});

test('honors custom api version and shop domain defaults', () => {
  const req = buildProductRequest(1, { apiVersion: '2023-10' });
  assert.ok(req.path.startsWith('/admin/api/2023-10/'));
});

test('throws on empty id or handle', () => {
  assert.throws(() => buildProductRequest(''), RangeError);
  assert.throws(() => buildProductRequest(null), RangeError);
  assert.throws(() => buildProductRequest(undefined), RangeError);
});

// --- buildProductListRequest ---

test('builds a GET request to the products collection', () => {
  const req = buildProductListRequest();
  assert.strictEqual(req.method, 'GET');
  assert.strictEqual(req.path, '/admin/api/2024-07/products.json');
  assert.deepStrictEqual(req.query, {});
});

test('includes limit, fields, filters, and pagination cursor in the query', () => {
  const req = buildProductListRequest({
    limit: 50,
    fields: ['id', 'title'],
    vendor: 'Acme',
    after: 'abc123',
  });
  assert.deepStrictEqual(req.query, {
    fields: 'id,title',
    limit: 50,
    vendor: 'Acme',
    after: 'abc123',
  });
});

test('serializes an ids array as a comma-separated list', () => {
  const req = buildProductListRequest({ ids: [1, 2, 3] });
  assert.strictEqual(req.query.ids, '1,2,3');
});

test('omits undefined and empty filter values', () => {
  const req = buildProductListRequest({ vendor: '', title: undefined, status: 'active' });
  assert.ok(!('vendor' in req.query));
  assert.ok(!('title' in req.query));
  assert.strictEqual(req.query.status, 'active');
});

test('rejects out-of-range limit values', () => {
  assert.throws(() => buildProductListRequest({ limit: 0 }), RangeError);
  assert.throws(() => buildProductListRequest({ limit: MAX_PAGE_SIZE + 1 }), RangeError);
  assert.throws(() => buildProductListRequest({ limit: 2.5 }), RangeError);
});

test('accepts boundary limit values', () => {
  assert.doesNotThrow(() => buildProductListRequest({ limit: 1 }));
  assert.doesNotThrow(() => buildProductListRequest({ limit: MAX_PAGE_SIZE }));
});

// --- buildQuery ---

test('joins fields into a comma-separated string and drops empties', () => {
  const q = buildQuery({ fields: ['id', '', 'title'] });
  assert.strictEqual(q.fields, 'id,title');
});

test('returns an empty object when nothing is set', () => {
  assert.deepStrictEqual(buildQuery({}), {});
});

// --- normalizeProduct ---

test('normalizes a full product record', () => {
  const p = normalizeProduct({
    id: 99,
    title: 'Widget',
    handle: 'widget',
    vendor: 'Acme',
    product_type: 'Gadget',
    tags: 'sale, new ',
    published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    available: true,
    price: '10.00',
    price_min: '8.00',
    price_max: '12.00',
    variants: [{ id: 1, title: 'Default', sku: 'W-1', barcode: '123', price: '10.00', inventory_policy: 'continue', available: true }],
    images: [{ src: 'https://cdn/widget.jpg' }],
  });

  assert.strictEqual(p.id, 99);
  assert.strictEqual(p.title, 'Widget');
  assert.strictEqual(p.productType, 'Gadget');
  assert.deepStrictEqual(p.tags, ['sale', 'new']);
  assert.strictEqual(p.published, true);
  assert.strictEqual(p.price, 10);
  assert.deepStrictEqual(p.priceRange, { min: 8, max: 12 });
  assert.strictEqual(p.variantCount, 1);
  assert.strictEqual(p.variants[0].sku, 'W-1');
  assert.strictEqual(p.imageCount, 1);
  assert.strictEqual(p.featuredImage, 'https://cdn/widget.jpg');
});

test('handles a product with no variants or images', () => {
  const p = normalizeProduct({ id: 5, title: 'Bare' });
  assert.strictEqual(p.variantCount, 0);
  assert.deepStrictEqual(p.variants, []);
  assert.strictEqual(p.imageCount, 0);
  assert.strictEqual(p.featuredImage, null);
  assert.strictEqual(p.price, null);
  assert.deepStrictEqual(p.priceRange, { min: null, max: null });
  assert.deepStrictEqual(p.tags, []);
});

test('coerces missing booleans to false and missing strings to empty', () => {
  const p = normalizeProduct({ id: 6 });
  assert.strictEqual(p.published, false);
  assert.strictEqual(p.available, false);
  assert.strictEqual(p.title, '');
  assert.strictEqual(p.handle, '');
});

test('converts price strings to numbers and keeps invalid ones null', () => {
  assert.strictEqual(normalizeProduct({ price: '12.50' }).price, 12.5);
  assert.strictEqual(normalizeProduct({ price: '' }).price, null);
  assert.strictEqual(normalizeProduct({ price: 'not-a-number' }).price, null);
});

test('throws on a non-object product', () => {
  assert.throws(() => normalizeProduct(null), RangeError);
  assert.throws(() => normalizeProduct('nope'), RangeError);
});

// --- parseProducts ---

test('parses a standard products-list response body', () => {
  const body = { products: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }] };
  const out = parseProducts(body);
  assert.strictEqual(out.length, 2);
  assert.deepStrictEqual(out.map((p) => p.id), [1, 2]);
});

test('accepts a bare array of products', () => {
  const out = parseProducts([{ id: 7, title: 'Solo' }]);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].id, 7);
});

test('returns an empty array for an empty products list', () => {
  assert.deepStrictEqual(parseProducts({ products: [] }), []);
});

test('throws when the body has no products array', () => {
  assert.throws(() => parseProducts({ foo: 'bar' }), RangeError);
  assert.throws(() => parseProducts(null), RangeError);
});
