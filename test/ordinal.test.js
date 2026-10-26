'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  dayOfYear, formatOrdinal, fromOrdinal,
  isValidDate, daysInMonth, daysInYear, isLeapYear,
} = require('../ordinal.js');

// --- dayOfYear on known dates ---

test('January 1 is always day 1', () => {
  assert.strictEqual(dayOfYear(2024, 1, 1), 1);
  assert.strictEqual(dayOfYear(2023, 1, 1), 1);
});

test('known date in a common year', () => {
  // August 20, 2023 -> day 232 (31+28+31+30+31+30+31+20)
  assert.strictEqual(dayOfYear(2023, 8, 20), 232);
});

test('known date in a leap year', () => {
  // December 19, 2024 -> day 354 (leap year adds the extra Feb day)
  assert.strictEqual(dayOfYear(2024, 12, 19), 354);
});

test('year-end dates', () => {
  assert.strictEqual(dayOfYear(2023, 12, 31), 365);
  assert.strictEqual(dayOfYear(2024, 12, 31), 366);
});

test('day after February differs by leap-year status', () => {
  // March 1 falls on day 60 in a common year, day 61 in a leap year.
  assert.strictEqual(dayOfYear(2023, 3, 1), 60);
  assert.strictEqual(dayOfYear(2024, 3, 1), 61);
});

// --- formatOrdinal ---

test('formats with zero-padded day number', () => {
  assert.strictEqual(formatOrdinal(2024, 1, 5), '2024-005');
  assert.strictEqual(formatOrdinal(2024, 12, 19), '2024-354');
});

test('pads single-digit years to four digits', () => {
  assert.strictEqual(formatOrdinal(1, 1, 1), '0001-001');
});

// --- fromOrdinal (inverse conversion) ---

test('first and last day of common and leap years', () => {
  assert.deepStrictEqual(fromOrdinal(2023, 1), { month: 1, day: 1 });
  assert.deepStrictEqual(fromOrdinal(2023, 365), { month: 12, day: 31 });
  assert.deepStrictEqual(fromOrdinal(2024, 366), { month: 12, day: 31 });
});

test('leap day is day 60 in leap years', () => {
  assert.deepStrictEqual(fromOrdinal(2024, 60), { month: 2, day: 29 });
  assert.deepStrictEqual(fromOrdinal(2024, 59), { month: 2, day: 28 });
  assert.deepStrictEqual(fromOrdinal(2024, 61), { month: 3, day: 1 });
  // In a common year, day 60 is already March 1.
  assert.deepStrictEqual(fromOrdinal(2023, 60), { month: 3, day: 1 });
});

test('round-trips every day of 2023 and 2024', () => {
  for (const y of [2023, 2024]) {
    const total = daysInYear(y);
    for (let n = 1; n <= total; n++) {
      const { month, day } = fromOrdinal(y, n);
      assert.strictEqual(dayOfYear(y, month, day), n, `day ${n} of ${y}`);
    }
  }
});

test('round-trips a sample of historical and far-future dates', () => {
  const samples = [[1776, 7, 4], [1900, 2, 28], [2000, 2, 29], [9999, 12, 31]];
  for (const [y, m, d] of samples) {
    const n = dayOfYear(y, m, d);
    const back = fromOrdinal(y, n);
    assert.deepStrictEqual(back, { month: m, day: d }, `${y}-${m}-${d}`);
  }
});

// --- invalid input ---

test('dayOfYear rejects invalid dates with RangeError', () => {
  assert.throws(() => dayOfYear(2023, 2, 29), RangeError);  // not a leap year
  assert.throws(() => dayOfYear(2024, 4, 31), RangeError);  // April has 30 days
  assert.throws(() => dayOfYear(2024, 13, 1), RangeError);  // month 13
  assert.throws(() => dayOfYear(0, 1, 1), RangeError);      // before AD
});

test('fromOrdinal rejects out-of-range day numbers', () => {
  assert.throws(() => fromOrdinal(2023, 0), RangeError);
  assert.throws(() => fromOrdinal(2023, 366), RangeError);  // 2023 has 365 days
  assert.throws(() => fromOrdinal(2024, 367), RangeError);  // 2024 has 366 days
  assert.throws(() => fromOrdinal(2024, -1), RangeError);
  assert.throws(() => fromOrdinal(2024, 1.5), RangeError);  // non-integer
});

test('fromOrdinal rejects out-of-range years', () => {
  assert.throws(() => fromOrdinal(0, 1), RangeError);
  assert.throws(() => fromOrdinal(10000, 1), RangeError);
});

// --- helper consistency ---

test('daysInYear agrees with leap-year rule', () => {
  assert.strictEqual(daysInYear(2023), 365);
  assert.strictEqual(daysInYear(2024), 366);
  assert.strictEqual(daysInYear(1900), 365); // century, not divisible by 400
  assert.strictEqual(daysInYear(2000), 366); // divisible by 400
  assert.strictEqual(isLeapYear(2024), true);
  assert.strictEqual(isLeapYear(1900), false);
});
