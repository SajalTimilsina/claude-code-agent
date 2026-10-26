'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { dateDiff, isValidDate, daysInMonth, isLeapYear } = require('../dateDiff.js');

test('plain forward difference', () => {
  // 1990-05-15 -> 2024-08-20 : 34 years, 3 months, 5 days
  const d = dateDiff(1990, 5, 15, 2024, 8, 20);
  assert.deepStrictEqual({ y: d.years, m: d.months, day: d.days }, { y: 34, m: 3, day: 5 });
  assert.strictEqual(d.direction, 'forward');
  assert.strictEqual(d.formatted, '34 years, 3 months, 5 days');
});

test('backward difference reports direction', () => {
  // Same span, reversed argument order.
  const d = dateDiff(2024, 8, 20, 1990, 5, 15);
  assert.deepStrictEqual({ y: d.years, m: d.months, day: d.days }, { y: 34, m: 3, day: 5 });
  assert.strictEqual(d.direction, 'backward');
});

test('same date is zero in both directions', () => {
  const d = dateDiff(2000, 1, 1, 2000, 1, 1);
  assert.deepStrictEqual({ y: d.years, m: d.months, day: d.days }, { y: 0, m: 0, day: 0 });
  assert.strictEqual(d.totalDays, 0);
  assert.strictEqual(d.direction, 'forward');
});

test('day borrowing across a short month', () => {
  // 1990-03-31 -> 1990-04-01 : 1 day (March has 31 days)
  const d = dateDiff(1990, 3, 31, 1990, 4, 1);
  assert.deepStrictEqual({ y: d.years, m: d.months, day: d.days }, { y: 0, m: 0, day: 1 });
});

test('month borrowing when end day is before start day', () => {
  // 2000-12-31 -> 2025-06-01 : 24 years, 5 months, 1 day
  const d = dateDiff(2000, 12, 31, 2025, 6, 1);
  assert.deepStrictEqual({ y: d.years, m: d.months, day: d.days }, { y: 24, m: 5, day: 1 });
});

test('leap-year span crossing Feb 29', () => {
  // 2023-02-28 -> 2024-03-01 crosses the leap day; total should be 367 days.
  // Breakdown: Feb 28 -> Feb 28 (next year) is 1 year, then Mar 1 is 2 days on.
  const d = dateDiff(2023, 2, 28, 2024, 3, 1);
  assert.strictEqual(d.totalDays, 367);
  assert.deepStrictEqual({ y: d.years, m: d.months, day: d.days }, { y: 1, m: 0, day: 2 });
});

test('totalDays matches calendar difference for a year', () => {
  // 2024-01-01 -> 2024-12-31 = 365 days (2024 is a leap year, endpoints inside it)
  const d = dateDiff(2024, 1, 1, 2024, 12, 31);
  assert.strictEqual(d.totalDays, 365);
});

test('totalDays for a full non-leap year', () => {
  // 1990-01-01 -> 1991-01-01 = 365 days
  const d = dateDiff(1990, 1, 1, 1991, 1, 1);
  assert.strictEqual(d.totalDays, 365);
  assert.deepStrictEqual({ y: d.years, m: d.months, day: d.days }, { y: 1, m: 0, day: 0 });
});

test('totalDays for a full leap year', () => {
  // 2024-01-01 -> 2025-01-01 = 366 days
  const d = dateDiff(2024, 1, 1, 2025, 1, 1);
  assert.strictEqual(d.totalDays, 366);
});

test('formatted string uses singular forms', () => {
  const d = dateDiff(2000, 1, 1, 2001, 2, 2);
  assert.strictEqual(d.formatted, '1 year, 1 month, 1 day');
});

test('throws on invalid start date (month 13)', () => {
  assert.throws(() => dateDiff(1990, 13, 1, 2000, 1, 1), RangeError);
});

test('throws on invalid end date (Feb 30)', () => {
  assert.throws(() => dateDiff(2000, 1, 1, 1990, 2, 30), RangeError);
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
