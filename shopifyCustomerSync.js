'use strict';

/**
 * Shopify customer sync — data transformation + request planning.
 *
 * This module prepares customer records for syncing to a Shopify store through
 * the Admin API. It is intentionally dependency-free (no HTTP client): it takes
 * raw customer records, normalizes them into Shopify's `Customer` resource
 * shape, validates them against Shopify's field constraints, decides what to do
 * with each record (create / update / skip) by comparing it against the
 * currently-known Shopify state, and builds the exact Admin API requests to send.
 *
 * A real integration would feed the output of {@link planSync} to an HTTP
 * client; this module stops at producing those requests so it stays easy to
 * test and reason about.
 */

// --- Shopify field constraints (from the Admin API Customer resource) ---

const FIRST_NAME_MAX = 50;
const LAST_NAME_MAX = 50;
const COMPANY_MAX = 255;
const EMAIL_MAX = 255;
const NOTE_MAX = 1000;
const PHONE_MAX = 50;
const TAGS_MAX = 255;

const REQUIRED_FIELDS = ['first_name', 'last_name'];
const OPTIONAL_FIELDS = [
  'email', 'phone', 'company', 'note', 'tax_exempt', 'tags',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalize a raw customer record into Shopify's Customer shape.
 *
 * Accepts common source spellings (camelCase or snake_case), trims strings,
 * drops empty optional fields, and coerces types. Returns `{ customer, errors }`
 * where `customer` is null when the record is invalid.
 *
 * @param {object} raw A raw customer record.
 * @returns {{customer:(object|null), errors:string[]}}
 */
function normalizeCustomer(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { customer: null, errors: ['Record must be a non-null object'] };
  }

  const get = (snake, camel) => {
    if (Object.prototype.hasOwnProperty.call(raw, snake)) return raw[snake];
    if (Object.prototype.hasOwnProperty.call(raw, camel)) return raw[camel];
    return undefined;
  };

  const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
  const bool = (v) => v === true || v === 'true' || v === 1 || v === '1';

  const firstName = str(get('first_name', 'firstName'));
  const lastName = str(get('last_name', 'lastName'));
  const email = str(get('email'));
  const phone = str(get('phone'));
  const company = str(get('company'));
  const note = str(get('note'));
  const taxExempt = bool(get('tax_exempt', 'taxExempt'));
  const tagsRaw = get('tags');

  // Validate required fields.
  if (!firstName) errors.push('first_name is required');
  else if (firstName.length > FIRST_NAME_MAX) errors.push(`first_name exceeds ${FIRST_NAME_MAX} characters`);

  if (!lastName) errors.push('last_name is required');
  else if (lastName.length > LAST_NAME_MAX) errors.push(`last_name exceeds ${LAST_NAME_MAX} characters`);

  if (email && !EMAIL_RE.test(email)) errors.push('email is not a valid address');
  else if (email && email.length > EMAIL_MAX) errors.push(`email exceeds ${EMAIL_MAX} characters`);

  if (phone && phone.length > PHONE_MAX) errors.push(`phone exceeds ${PHONE_MAX} characters`);
  if (company && company.length > COMPANY_MAX) errors.push(`company exceeds ${COMPANY_MAX} characters`);
  if (note && note.length > NOTE_MAX) errors.push(`note exceeds ${NOTE_MAX} characters`);

  // Normalize tags: accept an array or a comma-separated string.
  let tags = [];
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof tagsRaw === 'string') {
    tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
  }
  const tagString = tags.join(', ');
  if (tagString.length > TAGS_MAX) errors.push(`tags exceed ${TAGS_MAX} characters`);

  if (errors.length > 0) {
    return { customer: null, errors };
  }

  const customer = {
    first_name: firstName,
    last_name: lastName,
  };
  if (email) customer.email = email;
  if (phone) customer.phone = phone;
  if (company) customer.company = company;
  if (note) customer.note = note;
  if (taxExempt) customer.tax_exempt = true;
  if (tags.length > 0) customer.tags = tagString;

  return { customer, errors: [] };
}

/**
 * Compare a normalized customer against the current Shopify state and decide
 * the sync action.
 *
 * @param {object} incoming The normalized customer (from {@link normalizeCustomer}).
 * @param {object|null} existing The matching Shopify customer, or null/undefined
 *   when no such customer exists yet.
 * @returns {{action:"create"|"update"|"none", changedFields:string[]}}
 */
function diffCustomer(incoming, existing) {
  if (!existing) {
    return { action: 'create', changedFields: Object.keys(incoming) };
  }

  const changedFields = [];
  const allFields = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);
  for (const field of allFields) {
    const a = incoming[field];
    const b = existing[field];
    // Treat missing/false as equivalent for optional boolean-ish fields.
    const av = a === undefined || a === false ? undefined : a;
    const bv = b === undefined || b === false ? undefined : b;
    if (av !== bv) changedFields.push(field);
  }

  return {
    action: changedFields.length > 0 ? 'update' : 'none',
    changedFields,
  };
}

/**
 * Build the Admin API request(s) for a single planned action.
 *
 * @param {{action:string, customer:object, id?:(number|string)}} item A planned
 *   sync item from {@link planSync}.
 * @param {{shopDomain?:string, apiVersion?:string}} [opts] Optional endpoint config.
 * @returns {{method:string, path:string, body:object}|null} null when action is "none".
 */
function buildRequest(item, opts = {}) {
  const shopDomain = opts.shopDomain || 'my-store.myshopify.com';
  const apiVersion = opts.apiVersion || '2024-07';
  const base = `/admin/api/${apiVersion}`;

  if (item.action === 'create') {
    return {
      method: 'POST',
      path: `${base}/customers.json`,
      body: { customer: item.customer },
    };
  }
  if (item.action === 'update') {
    if (item.id === undefined || item.id === null) {
      throw new RangeError('Cannot build an update request without a customer id');
    }
    return {
      method: 'PUT',
      path: `${base}/customers/${item.id}.json`,
      body: { customer: item.customer },
    };
  }
  return null; // "none" -> no request
}

/**
 * Plan a full sync: normalize every record, diff against known state, and attach
 * the Admin API request to each item that needs one.
 *
 * @param {object[]} rawRecords Raw customer records.
 * @param {object[]} [knownShopifyCustomers] Customers already in Shopify. Matched
 *   by `id` when present, otherwise by `email`.
 * @param {{shopDomain?:string, apiVersion?:string}} [opts] Endpoint config.
 * @returns {{items:{status:"ok"|"error", action?:string, customer?:object,
 *   changedFields?:string[], request?:object, errors?:string[], index:number}[],
 *   summary:{total:number, create:number, update:number, none:number, error:number}}}
 */
function planSync(rawRecords, knownShopifyCustomers = [], opts = {}) {
  if (!Array.isArray(rawRecords)) {
    throw new RangeError('rawRecords must be an array');
  }

  // Index known customers for O(1) lookup by id, then by email.
  const byId = new Map();
  const byEmail = new Map();
  for (const c of knownShopifyCustomers) {
    if (c && c.id != null) byId.set(String(c.id), c);
    if (c && c.email) byEmail.set(String(c.email).toLowerCase(), c);
  }
  const findExisting = (record, customer) => {
    if (record && record.id != null) return byId.get(String(record.id)) || null;
    if (customer && customer.email) return byEmail.get(customer.email.toLowerCase()) || null;
    return null;
  };

  const items = [];
  const summary = { total: rawRecords.length, create: 0, update: 0, none: 0, error: 0 };

  rawRecords.forEach((record, index) => {
    const { customer, errors } = normalizeCustomer(record);
    if (!customer) {
      summary.error += 1;
      items.push({ status: 'error', errors, index });
      return;
    }

    const existing = findExisting(record, customer);
    const { action, changedFields } = diffCustomer(customer, existing);
    const request = buildRequest(
      { action, customer, id: existing ? existing.id : undefined },
      opts
    );

    if (action === 'create') summary.create += 1;
    else if (action === 'update') summary.update += 1;
    else summary.none += 1;

    items.push({
      status: 'ok',
      action,
      customer,
      changedFields,
      request,
      index,
    });
  });

  return { items, summary };
}

module.exports = {
  normalizeCustomer,
  diffCustomer,
  buildRequest,
  planSync,
  // Exported for reuse/testing:
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  EMAIL_RE,
};

// CLI entry point: node shopifyCustomerSync.js <records.json> [known-customers.json]
if (require.main === module) {
  const fs = require('fs');
  const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node shopifyCustomerSync.js <records.json> [known-customers.json]');
    process.exit(1);
  }

  let records, known;
  try {
    records = readJson(args[0]);
    known = args.length >= 2 ? readJson(args[1]) : [];
  } catch (e) {
    console.error(`Failed to read input: ${e.message}`);
    process.exit(1);
  }

  const { items, summary } = planSync(records, known);
  for (const item of items) {
    if (item.status === 'error') {
      console.log(`[${item.index}] ERROR: ${item.errors.join('; ')}`);
    } else if (item.request) {
      console.log(`[${item.index}] ${item.request.method} ${item.request.path}`);
      console.log(`        body: ${JSON.stringify(item.request.body)}`);
    } else {
      console.log(`[${item.index}] NO-OP (no changes)`);
    }
  }
  console.log(
    `\nSummary: ${summary.total} total, ${summary.create} create, ` +
      `${summary.update} update, ${summary.none} no-op, ${summary.error} error`
  );
}
