'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  normalizeCustomer,
  diffCustomer,
  buildRequest,
  planSync,
} = require('../shopifyCustomerSync.js');

// --- normalizeCustomer ---

test('normalizes snake_case fields and trims whitespace', () => {
  const { customer, errors } = normalizeCustomer({
    first_name: '  Ada  ',
    last_name: 'Lovelace',
    email: 'ada@analytical.engine',
  });
  assert.deepStrictEqual(customer, {
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@analytical.engine',
  });
  assert.deepStrictEqual(errors, []);
});

test('accepts camelCase source spellings', () => {
  const { customer } = normalizeCustomer({
    firstName: 'Grace',
    lastName: 'Hopper',
    phone: '555-0100',
    taxExempt: true,
  });
  assert.strictEqual(customer.first_name, 'Grace');
  assert.strictEqual(customer.last_name, 'Hopper');
  assert.strictEqual(customer.phone, '555-0100');
  assert.strictEqual(customer.tax_exempt, true);
});

test('drops empty optional fields', () => {
  const { customer } = normalizeCustomer({
    first_name: 'A',
    last_name: 'B',
    email: '',
    company: '   ',
    note: null,
  });
  assert.ok(!('email' in customer));
  assert.ok(!('company' in customer));
  assert.ok(!('note' in customer));
});

test('normalizes tags from an array', () => {
  const { customer } = normalizeCustomer({
    first_name: 'A',
    last_name: 'B',
    tags: ['VIP', ' beta ', ''],
  });
  assert.strictEqual(customer.tags, 'VIP, beta');
});

test('normalizes tags from a comma-separated string', () => {
  const { customer } = normalizeCustomer({
    first_name: 'A',
    last_name: 'B',
    tags: 'x, y , z',
  });
  assert.strictEqual(customer.tags, 'x, y, z');
});

test('coerces tax_exempt from truthy strings and numbers', () => {
  for (const v of [true, 'true', 1, '1']) {
    const { customer } = normalizeCustomer({ first_name: 'A', last_name: 'B', tax_exempt: v });
    assert.strictEqual(customer.tax_exempt, true, `expected true for ${JSON.stringify(v)}`);
  }
  const { customer } = normalizeCustomer({ first_name: 'A', last_name: 'B', tax_exempt: false });
  assert.ok(!('tax_exempt' in customer));
});

// --- validation ---

test('requires first_name and last_name', () => {
  const { customer, errors } = normalizeCustomer({ email: 'a@b.c' });
  assert.strictEqual(customer, null);
  assert.ok(errors.includes('first_name is required'));
  assert.ok(errors.includes('last_name is required'));
});

test('rejects invalid email addresses', () => {
  const { customer, errors } = normalizeCustomer({
    first_name: 'A',
    last_name: 'B',
    email: 'not-an-email',
  });
  assert.strictEqual(customer, null);
  assert.ok(errors.some((e) => e.includes('email')));
});

test('enforces field length limits', () => {
  const tooLongFirst = normalizeCustomer({ first_name: 'x'.repeat(51), last_name: 'B' });
  assert.strictEqual(tooLongFirst.customer, null);
  assert.ok(tooLongFirst.errors.some((e) => e.includes('first_name exceeds')));

  const tooLongNote = normalizeCustomer({ first_name: 'A', last_name: 'B', note: 'n'.repeat(1001) });
  assert.strictEqual(tooLongNote.customer, null);
  assert.ok(tooLongNote.errors.some((e) => e.includes('note exceeds')));
});

test('rejects non-object records', () => {
  for (const bad of [null, undefined, 'string', 42, [1, 2]]) {
    const { customer, errors } = normalizeCustomer(bad);
    assert.strictEqual(customer, null);
    assert.ok(errors.length > 0);
  }
});

// --- diffCustomer ---

test('creates when no existing customer is present', () => {
  const result = diffCustomer({ first_name: 'A', last_name: 'B' }, null);
  assert.strictEqual(result.action, 'create');
  assert.deepStrictEqual(result.changedFields, ['first_name', 'last_name']);
});

test('updates only the changed fields', () => {
  const incoming = { first_name: 'Ada', last_name: 'Lovelace', email: 'new@b.c' };
  const existing = { first_name: 'Ada', last_name: 'Lovelace', email: 'old@b.c' };
  const result = diffCustomer(incoming, existing);
  assert.strictEqual(result.action, 'update');
  assert.deepStrictEqual(result.changedFields, ['email']);
});

test('reports no-op when nothing changed', () => {
  const c = { first_name: 'Ada', last_name: 'Lovelace', email: 'a@b.c' };
  const result = diffCustomer(c, { ...c });
  assert.strictEqual(result.action, 'none');
  assert.deepStrictEqual(result.changedFields, []);
});

test('treats missing and false as equivalent for optional fields', () => {
  // Incoming has no tax_exempt; existing has it explicitly false -> no change.
  const result = diffCustomer(
    { first_name: 'A', last_name: 'B' },
    { first_name: 'A', last_name: 'B', tax_exempt: false }
  );
  assert.strictEqual(result.action, 'none');
});

// --- buildRequest ---

test('builds a create request', () => {
  const req = buildRequest({ action: 'create', customer: { first_name: 'A', last_name: 'B' } });
  assert.strictEqual(req.method, 'POST');
  assert.strictEqual(req.path, '/admin/api/2024-07/customers.json');
  assert.deepStrictEqual(req.body, { customer: { first_name: 'A', last_name: 'B' } });
});

test('builds an update request with the customer id', () => {
  const req = buildRequest({ action: 'update', id: 100, customer: { first_name: 'A', last_name: 'B' } });
  assert.strictEqual(req.method, 'PUT');
  assert.strictEqual(req.path, '/admin/api/2024-07/customers/100.json');
});

test('returns null for a no-op action', () => {
  assert.strictEqual(buildRequest({ action: 'none', customer: {} }), null);
});

test('throws when building an update without an id', () => {
  assert.throws(() => buildRequest({ action: 'update', customer: {} }), RangeError);
});

test('honors custom shop domain and api version', () => {
  const req = buildRequest(
    { action: 'create', customer: { first_name: 'A', last_name: 'B' } },
    { shopDomain: 'acme.myshopify.com', apiVersion: '2023-10' }
  );
  assert.strictEqual(req.path, '/admin/api/2023-10/customers.json');
});

// --- planSync ---

test('plans create/update/no-op/error across a mixed batch', () => {
  const known = [{ id: 100, first_name: 'Ada', last_name: 'Lovelace', email: 'a@b.c' }];
  const { items, summary } = planSync(
    [
      { first_name: 'Ada', last_name: 'Lovelace', email: 'a@b.c' },        // none
      { first_name: 'Ada', last_name: 'Lovelace', email: 'new@b.c', id: 100 }, // update by id
      { first_name: 'New', last_name: 'Person', email: 'n@p.io' },         // create
      { email: 'only-email' },                                            // error
    ],
    known
  );

  assert.strictEqual(items[0].action, 'none');
  assert.strictEqual(items[0].request, null);
  assert.strictEqual(items[1].action, 'update');
  assert.strictEqual(items[1].request.path, '/admin/api/2024-07/customers/100.json');
  assert.strictEqual(items[2].action, 'create');
  assert.strictEqual(items[2].request.method, 'POST');
  assert.strictEqual(items[3].status, 'error');
  assert.ok(items[3].errors.length > 0);

  assert.deepStrictEqual(summary, { total: 4, create: 1, update: 1, none: 1, error: 1 });
});

test('matches existing customers by email when no id is provided', () => {
  const known = [{ id: 42, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@b.c' }];
  const { items } = planSync([{ first_name: 'Ada', last_name: 'Lovelace', email: 'ada@b.c' }], known);
  assert.strictEqual(items[0].action, 'none');
});

test('creates when a record has no matching known customer', () => {
  const { items } = planSync([{ first_name: 'Fresh', last_name: 'Face', email: 'f@f.io' }], []);
  assert.strictEqual(items[0].action, 'create');
});

test('throws when rawRecords is not an array', () => {
  assert.throws(() => planSync('nope'), RangeError);
  assert.throws(() => planSync(null), RangeError);
});

test('handles an empty batch', () => {
  const { items, summary } = planSync([]);
  assert.deepStrictEqual(items, []);
  assert.deepStrictEqual(summary, { total: 0, create: 0, update: 0, none: 0, error: 0 });
});
