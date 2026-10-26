'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  addDays,
  addMonths,
  addYears,
  isValidDate,
  daysInMonth,
  isLeapYear,
} = require('../dateAdd.js');

// ---------------------------------------------------------------------------
// addDays — basic
// ---------------------------------------------------------------------------

test('adds one day within the same month', () => {
  const r = addDays(2024, 7, 4, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 7, day: 5 });
});

test('subtracts one day within the same month', () => {
  const r = addDays(2024, 7, 4, -1);
  assert.deepStrictEqual(r, { year: 2024, month: 7, day: 3 });
});

test('zero offset returns the same date', () => {
  const r = addDays(2024, 7, 4, 0);
  assert.deepStrictEqual(r, { year: 2024, month: 7, day: 4 });
});

// ---------------------------------------------------------------------------
// addDays — month rollover
// ---------------------------------------------------------------------------

test('rolls over from end of July to August', () => {
  const r = addDays(2024, 7, 31, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 8, day: 1 });
});

test('rolls back from start of August to July', () => {
  const r = addDays(2024, 8, 1, -1);
  assert.deepStrictEqual(r, { year: 2024, month: 7, day: 31 });
});

test('rolls over across a 30-day month (June)', () => {
  const r = addDays(2024, 6, 30, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 7, day: 1 });
});

// ---------------------------------------------------------------------------
// addDays — year rollover
// ---------------------------------------------------------------------------

test('rolls over from Dec 31 to Jan 1 next year', () => {
  const r = addDays(2024, 12, 31, 1);
  assert.deepStrictEqual(r, { year: 2025, month: 1, day: 1 });
});

test('rolls back from Jan 1 to Dec 31 previous year', () => {
  const r = addDays(2025, 1, 1, -1);
  assert.deepStrictEqual(r, { year: 2024, month: 12, day: 31 });
});

// ---------------------------------------------------------------------------
// addDays — leap year handling
// ---------------------------------------------------------------------------

test('crosses Feb 29 in a leap year', () => {
  // 2024-02-28 + 1 day = 2024-02-29
  const r = addDays(2024, 2, 28, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 2, day: 29 });
  // 2024-02-29 + 1 day = 2024-03-01
  const r2 = addDays(2024, 2, 29, 1);
  assert.deepStrictEqual(r2, { year: 2024, month: 3, day: 1 });
});

test('skips Feb 29 in a non-leap year', () => {
  // 2023-02-28 + 1 day = 2023-03-01 (no Feb 29)
  const r = addDays(2023, 2, 28, 1);
  assert.deepStrictEqual(r, { year: 2023, month: 3, day: 1 });
});

test('multi-day span crossing a leap day', () => {
  // 2024-02-27 + 3 days = 2024-03-01 (crosses Feb 29)
  const r = addDays(2024, 2, 27, 3);
  assert.deepStrictEqual(r, { year: 2024, month: 3, day: 1 });
});

// ---------------------------------------------------------------------------
// addDays — large offsets
// ---------------------------------------------------------------------------

test('adds 365 days in a non-leap year', () => {
  const r = addDays(2023, 1, 1, 365);
  assert.deepStrictEqual(r, { year: 2024, month: 1, day: 1 });
});

test('adds 366 days in a leap year', () => {
  const r = addDays(2024, 1, 1, 366);
  assert.deepStrictEqual(r, { year: 2025, month: 1, day: 1 });
});

test('adds 30 days from Jan 1', () => {
  // Jan 1 + 30 days = Jan 31 (January has 31 days)
  const r = addDays(2024, 1, 1, 30);
  assert.deepStrictEqual(r, { year: 2024, month: 1, day: 31 });
});

test('adds 31 days from Jan 1 rolls to Feb 1', () => {
  const r = addDays(2024, 1, 1, 31);
  assert.deepStrictEqual(r, { year: 2024, month: 2, day: 1 });
});

test('subtracts 365 days', () => {
  const r = addDays(2024, 1, 1, -365);
  assert.deepStrictEqual(r, { year: 2023, month: 1, day: 1 });
});

// ---------------------------------------------------------------------------
// addDays — error cases
// ---------------------------------------------------------------------------

test('throws on invalid input date', () => {
  assert.throws(() => addDays(2024, 2, 30, 1), RangeError);
  assert.throws(() => addDays(2024, 13, 1, 1), RangeError);
});

test('throws on non-integer offset', () => {
  assert.throws(() => addDays(2024, 1, 1, 1.5), RangeError);
  assert.throws(() => addDays(2024, 1, 1, 'x'), RangeError);
});

test('throws when result goes before year 1', () => {
  // 0001-01-01 minus 1 day is before the AD range
  assert.throws(() => addDays(1, 1, 1, -1), RangeError);
});

test('throws when result exceeds year 9999', () => {
  // 9999-12-31 plus 1 day exceeds the AD range
  assert.throws(() => addDays(9999, 12, 31, 1), RangeError);
});

// ---------------------------------------------------------------------------
// addMonths — basic
// ---------------------------------------------------------------------------

test('adds one month within the same year', () => {
  const r = addMonths(2024, 1, 15, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 2, day: 15 });
});

test('subtracts one month', () => {
  const r = addMonths(2024, 3, 15, -1);
  assert.deepStrictEqual(r, { year: 2024, month: 2, day: 15 });
});

test('zero offset returns the same date', () => {
  const r = addMonths(2024, 7, 4, 0);
  assert.deepStrictEqual(r, { year: 2024, month: 7, day: 4 });
});

// ---------------------------------------------------------------------------
// addMonths — year rollover
// ---------------------------------------------------------------------------

test('rolls over from December to January', () => {
  const r = addMonths(2024, 12, 15, 1);
  assert.deepStrictEqual(r, { year: 2025, month: 1, day: 15 });
});

test('rolls back from January to December', () => {
  const r = addMonths(2025, 1, 15, -1);
  assert.deepStrictEqual(r, { year: 2024, month: 12, day: 15 });
});

test('adds 12 months equals one year', () => {
  const r = addMonths(2024, 6, 15, 12);
  assert.deepStrictEqual(r, { year: 2025, month: 6, day: 15 });
});

// ---------------------------------------------------------------------------
// addMonths — day clamping
// ---------------------------------------------------------------------------

test('clamps Jan 31 + 1 month to Feb 29 in leap year', () => {
  const r = addMonths(2024, 1, 31, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 2, day: 29 });
});

test('clamps Jan 31 + 1 month to Feb 28 in non-leap year', () => {
  const r = addMonths(2023, 1, 31, 1);
  assert.deepStrictEqual(r, { year: 2023, month: 2, day: 28 });
});

test('clamps Mar 31 + 1 month to Apr 30', () => {
  const r = addMonths(2024, 3, 31, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 4, day: 30 });
});

test('does not clamp when target month has enough days', () => {
  const r = addMonths(2024, 1, 15, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 2, day: 15 });
});

test('clamps May 31 + 1 month to Jun 30', () => {
  const r = addMonths(2024, 5, 31, 1);
  assert.deepStrictEqual(r, { year: 2024, month: 6, day: 30 });
});

// ---------------------------------------------------------------------------
// addMonths — error cases
// ---------------------------------------------------------------------------

test('throws on invalid input date', () => {
  assert.throws(() => addMonths(2024, 2, 30, 1), RangeError);
});

test('throws on non-integer offset', () => {
  assert.throws(() => addMonths(2024, 1, 1, 1.5), RangeError);
});

test('throws when result year is below 1', () => {
  assert.throws(() => addMonths(1, 1, 1, -1), RangeError);
});

test('throws when result year exceeds 9999', () => {
  assert.throws(() => addMonths(9999, 12, 1, 1), RangeError);
});

// ---------------------------------------------------------------------------
// addYears — basic
// ---------------------------------------------------------------------------

test('adds one year', () => {
  const r = addYears(2024, 7, 4, 1);
  assert.deepStrictEqual(r, { year: 2025, month: 7, day: 4 });
});

test('subtracts one year', () => {
  const r = addYears(2024, 7, 4, -1);
  assert.deepStrictEqual(r, { year: 2023, month: 7, day: 4 });
});

test('zero offset returns the same date', () => {
  const r = addYears(2024, 7, 4, 0);
  assert.deepStrictEqual(r, { year: 2024, month: 7, day: 4 });
});

// ---------------------------------------------------------------------------
// addYears — leap day clamping
// ---------------------------------------------------------------------------

test('clamps Feb 29 + 1 year to Feb 28 in non-leap year', () => {
  const r = addYears(2024, 2, 29, 1);
  assert.deepStrictEqual(r, { year: 2025, month: 2, day: 28 });
});

test('keeps Feb 29 + 4 years as Feb 29 (next leap year)', () => {
  const r = addYears(2024, 2, 29, 4);
  assert.deepStrictEqual(r, { year: 2028, month: 2, day: 29 });
});

test('clamps Feb 29 + 100 years correctly (century rule)', () => {
  // 2000-02-29 + 100 years = 2100-02-28 (2100 is NOT a leap year)
  const r = addYears(2000, 2, 29, 100);
  assert.deepStrictEqual(r, { year: 2100, month: 2, day: 28 });
});

// ---------------------------------------------------------------------------
// addYears — error cases
// ---------------------------------------------------------------------------

test('throws on invalid input date', () => {
  assert.throws(() => addYears(2024, 13, 1, 1), RangeError);
});

test('throws on non-integer offset', () => {
  assert.throws(() => addYears(2024, 1, 1, 0.5), RangeError);
});

test('throws when result year is below 1', () => {
  assert.throws(() => addYears(1, 1, 1, -1), RangeError);
});

test('throws when result year exceeds 9999', () => {
  assert.throws(() => addYears(9999, 1, 1, 1), RangeError);
});

// ---------------------------------------------------------------------------
// Round-trip consistency
// ---------------------------------------------------------------------------

test('addDays then subtract same amount returns original', () => {
  const original = { y: 2024, m: 7, d: 4 };
  const forward = addDays(original.y, original.m, original.d, 100);
  const back = addDays(forward.year, forward.month, forward.day, -100);
  assert.deepStrictEqual(back, { year: original.y, month: original.m, day: original.d });
});

test('addMonths then subtract same amount returns original (no clamping)', () => {
  const original = { y: 2024, m: 1, d: 15 };
  const forward = addMonths(original.y, original.m, original.d, 5);
  const back = addMonths(forward.year, forward.month, forward.day, -5);
  assert.deepStrictEqual(back, { year: original.y, month: original.m, day: original.d });
});

test('addYears then subtract same amount returns original', () => {
  const original = { y: 2024, m: 7, d: 4 };
  const forward = addYears(original.y, original.m, original.d, 10);
  const back = addYears(forward.year, forward.month, forward.day, -10);
  assert.deepStrictEqual(back, { year: original.y, month: original.m, day: original.d });
});

// ---------------------------------------------------------------------------
// Helper functions (shared pattern with other modules)
// ---------------------------------------------------------------------------

test('isValidDate accepts valid dates and rejects invalid ones', () => {
  assert.ok(isValidDate(2000, 2, 29));
  assert.ok(!isValidDate(1900, 2, 29));
  assert.ok(isValidDate(2024, 12, 31));
  assert.ok(!isValidDate(2024, 0, 1));
  assert.ok(!isValidDate(2024, 1, 0));
  assert.ok(!isValidDate(2024, 1, 32));
  assert.ok(!isValidDate(0, 1, 1));
});

test('daysInMonth handles February and regular months', () => {
  assert.strictEqual(daysInMonth(2024, 2), 29);
  assert.strictEqual(daysInMonth(2023, 2), 28);
  assert.strictEqual(daysInMonth(2023, 4), 30);
  assert.strictEqual(daysInMonth(2023, 7), 31);
});

test('isLeapYear follows Gregorian rules', () => {
  assert.ok(isLeapYear(2000));
  assert.ok(isLeapYear(2024));
  assert.ok(!isLeapYear(1900));
  assert.ok(!isLeapYear(2023));
});
