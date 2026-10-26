'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { toOrdinal, fromOrdinal, isValidDate, daysInMonth, daysInYear, isLeapYear } = require('../ordinalDate.js');

// --- toOrdinal ---

test('January 1st is day 1', () => {
  const o = toOrdinal(2024, 1, 1);
  assert.strictEqual(o.year, 2024);
  assert.strictEqual(o.dayOfYear, 1);
  assert.strictEqual(o.iso, '2024-1');
});

test('mid-year date in a leap year', () => {
  // 2024-08-20 is the 233rd day of 2024 (leap year)
  const o = toOrdinal(2024, 8, 20);
  assert.strictEqual(o.dayOfYear, 233);
  assert.strictEqual(o.iso, '2024-233');
});

test('December 31st in a non-leap year is day 365', () => {
  const o = toOrdinal(2023, 12, 31);
  assert.strictEqual(o.dayOfYear, 365);
  assert.strictEqual(o.iso, '2023-365');
});

test('December 31st in a leap year is day 366', () => {
  const o = toOrdinal(2024, 12, 31);
  assert.strictEqual(o.dayOfYear, 366);
  assert.strictEqual(o.iso, '2024-366');
});

test('leap year shifts March onward by one day', () => {
  // Before Feb 29 both years agree; after, the leap year is +1.
  assert.strictEqual(toOrdinal(2023, 2, 28).dayOfYear, 59);
  assert.strictEqual(toOrdinal(2024, 2, 28).dayOfYear, 59);
  assert.strictEqual(toOrdinal(2024, 2, 29).dayOfYear, 60);
  assert.strictEqual(toOrdinal(2023, 3, 1).dayOfYear, 60);
  assert.strictEqual(toOrdinal(2024, 3, 1).dayOfYear, 61);
});

test('throws on invalid date', () => {
  assert.throws(() => toOrdinal(2023, 2, 30), RangeError);
  assert.throws(() => toOrdinal(2023, 13, 1), RangeError);
  assert.throws(() => toOrdinal(2023, 1, 0), RangeError);
});

// --- fromOrdinal ---

test('day 1 is January 1st', () => {
  const c = fromOrdinal(2024, 1);
  assert.strictEqual(c.month, 1);
  assert.strictEqual(c.day, 1);
  assert.strictEqual(c.iso, '2024-1');
});

test('resolves a mid-year ordinal to the right calendar date', () => {
  // 2024-233 -> Aug 20
  const c = fromOrdinal(2024, 233);
  assert.strictEqual(c.month, 8);
  assert.strictEqual(c.day, 20);
});

test('last day of a non-leap year is December 31st', () => {
  const c = fromOrdinal(2023, 365);
  assert.strictEqual(c.month, 12);
  assert.strictEqual(c.day, 31);
});

test('last day of a leap year is December 31st at day 366', () => {
  const c = fromOrdinal(2024, 366);
  assert.strictEqual(c.month, 12);
  assert.strictEqual(c.day, 31);
});

test('day 60 in a leap year is February 29th', () => {
  const c = fromOrdinal(2024, 60);
  assert.strictEqual(c.month, 2);
  assert.strictEqual(c.day, 29);
});

test('rejects day 366 in a non-leap year', () => {
  assert.throws(() => fromOrdinal(2023, 366), RangeError);
});

test('rejects out-of-range and zero days', () => {
  assert.throws(() => fromOrdinal(2024, 0), RangeError);
  assert.throws(() => fromOrdinal(2024, 367), RangeError);
});

test('rejects out-of-range years', () => {
  assert.throws(() => fromOrdinal(0, 1), RangeError);       // AD starts at year 1
  assert.throws(() => fromOrdinal(10000, 1), RangeError);   // beyond year 9999
});

// --- round-trips ---

test('toOrdinal then fromOrdinal returns the original date', () => {
  for (const [y, m, d] of [[2024, 1, 1], [2024, 8, 20], [2024, 12, 31], [2023, 2, 28], [2024, 2, 29]]) {
    const o = toOrdinal(y, m, d);
    const c = fromOrdinal(o.year, o.dayOfYear);
    assert.strictEqual(c.month, m, `month mismatch for ${y}-${m}-${d}`);
    assert.strictEqual(c.day, d, `day mismatch for ${y}-${m}-${d}`);
  }
});

test('fromOrdinal then toOrdinal returns the original day-of-year', () => {
  for (const [y, doy] of [[2024, 1], [2024, 233], [2024, 366], [2023, 365], [2024, 60]]) {
    const c = fromOrdinal(y, doy);
    const o = toOrdinal(c.year, c.month, c.day);
    assert.strictEqual(o.dayOfYear, doy, `round-trip failed for ${y}-${doy}`);
  }
});

// --- helpers (shared with other tools) ---

test('daysInYear reflects leap vs non-leap years', () => {
  assert.strictEqual(daysInYear(2024), 366);
  assert.strictEqual(daysInYear(2023), 365);
  assert.strictEqual(daysInYear(2000), 366); // divisible by 400
  assert.strictEqual(daysInYear(1900), 365); // divisible by 100 but not 400
});

test('isValidDate accepts valid dates and rejects invalid ones', () => {
  assert.ok(isValidDate(2000, 2, 29));   // leap year
  assert.ok(!isValidDate(1900, 2, 29));  // century non-leap
  assert.ok(isValidDate(2000, 12, 31));
  assert.ok(!isValidDate(2000, 0, 1));
  assert.ok(!isValidDate(2000, 1, 0));
  assert.ok(!isValidDate(2000, 1, 32));
  assert.ok(!isValidDate(0, 1, 1));      // AD starts at year 1
});

test('daysInMonth handles February and regular months', () => {
  assert.strictEqual(daysInMonth(2024, 2), 29);
  assert.strictEqual(daysInMonth(2023, 2), 28);
  assert.strictEqual(daysInMonth(2023, 4), 30);
  assert.strictEqual(daysInMonth(2023, 7), 31);
});

test('isLeapYear follows Gregorian rules', () => {
  assert.ok(isLeapYear(2000));    // divisible by 400
  assert.ok(isLeapYear(2024));    // divisible by 4
  assert.ok(!isLeapYear(1900));   // divisible by 100 but not 400
  assert.ok(!isLeapYear(2023));
});
