'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { dateDiff, formatSpan } = require('../dateDiff.js');

test('same date gives zero days', () => {
  const d = dateDiff(2024, 1, 15, 2024, 1, 15);
  assert.strictEqual(d.days, 0);
  assert.strictEqual(d.years, 0);
  assert.strictEqual(d.months, 0);
  assert.strictEqual(d.daysLeft, 0);
  assert.strictEqual(d.formatted, '0 days');
});

test('positive span within the same month', () => {
  const d = dateDiff(2024, 3, 1, 2024, 3, 10);
  assert.strictEqual(d.days, 9);
  assert.strictEqual(d.formatted, '9 days');
});

test('negative span when end precedes start', () => {
  const d = dateDiff(2024, 3, 10, 2024, 3, 1);
  assert.strictEqual(d.days, -9);
  // breakdown is always non-negative, in the direction of travel
  assert.strictEqual(d.years, 0);
  assert.strictEqual(d.months, 0);
  assert.strictEqual(d.daysLeft, 9);
  assert.strictEqual(d.formatted, '9 days');
});

test('span crossing a month boundary with day borrowing', () => {
  // Jan 31 -> Mar 1 is 30 days total (Feb 2024 has 29 days).
  // A 1-month step from Jan 31 would land on "Feb 31" (invalid), so the
  // calendar breakdown falls back to 0 months, 30 days — consistent with how
  // exact-age reporting handles end-of-month spans.
  const d = dateDiff(2024, 1, 31, 2024, 3, 1);
  assert.strictEqual(d.days, 30);
  assert.strictEqual(d.years, 0);
  assert.strictEqual(d.months, 0);
  assert.strictEqual(d.daysLeft, 30);
  assert.strictEqual(d.formatted, '30 days');
});

test('day borrowing across a short month (non-leap)', () => {
  // Jan 31 -> Mar 1 in a non-leap year: 29 days total; same fallback shape.
  const d = dateDiff(2023, 1, 31, 2023, 3, 1);
  assert.strictEqual(d.days, 29);
  assert.strictEqual(d.months, 0);
  assert.strictEqual(d.daysLeft, 29);
});

test('whole-year span', () => {
  const d = dateDiff(2000, 6, 15, 2024, 6, 15);
  assert.strictEqual(d.years, 24);
  assert.strictEqual(d.months, 0);
  assert.strictEqual(d.daysLeft, 0);
  assert.strictEqual(d.formatted, '24 years');
  // 24 years incl. leap days 2004..2024 = 6 extra days beyond 24*365
  assert.strictEqual(d.days, 24 * 365 + 6);
});

test('mixed years/months/days span', () => {
  const d = dateDiff(1990, 5, 15, 2024, 8, 20);
  assert.strictEqual(d.years, 34);
  assert.strictEqual(d.months, 3);
  assert.strictEqual(d.daysLeft, 5);
  assert.strictEqual(d.formatted, '34 years, 3 months, 5 days');
});

test('leap-day end date in a leap year', () => {
  const d = dateDiff(2024, 2, 28, 2024, 2, 29);
  assert.strictEqual(d.days, 1);
  assert.strictEqual(d.formatted, '1 day');
});

test('century non-leap year (1900) has 28 Feb days', () => {
  const d = dateDiff(1900, 2, 27, 1900, 3, 1);
  assert.strictEqual(d.days, 2);
});

test('400-year century leap year (2000) has 29 Feb days', () => {
  const d = dateDiff(2000, 2, 28, 2000, 3, 1);
  assert.strictEqual(d.days, 2);
});

test('formatted string uses singular forms', () => {
  assert.strictEqual(formatSpan(1, 1, 1), '1 year, 1 month, 1 day');
  assert.strictEqual(formatSpan(0, 0, 1), '1 day');
  assert.strictEqual(formatSpan(0, 0, 0), '0 days');
});

test('throws on invalid start date', () => {
  assert.throws(() => dateDiff(2024, 13, 1, 2024, 12, 31), RangeError);
  assert.throws(() => dateDiff(2023, 2, 29, 2024, 1, 1), RangeError);
});

test('throws on invalid end date', () => {
  assert.throws(() => dateDiff(2024, 1, 1, 2024, 4, 31), RangeError);
});
