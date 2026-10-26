'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { calculateAge, isValidDate, daysInMonth, isLeapYear } = require('../age.js');

test('exact age on a plain date', () => {
  // Born 1990-05-15, reference 2024-08-20 -> 34 years, 3 months, 5 days
  const age = calculateAge(1990, 5, 15, 2024, 8, 20);
  assert.deepStrictEqual({ y: age.years, m: age.months, d: age.days }, { y: 34, m: 3, d: 5 });
  assert.strictEqual(age.formatted, '34 years, 3 months, 5 days');
});

test('age before this year\'s birthday (months borrow)', () => {
  // Born 2000-12-31, reference 2025-06-01 -> 24 years, 5 months, 1 day
  const age = calculateAge(2000, 12, 31, 2025, 6, 1);
  assert.deepStrictEqual({ y: age.years, m: age.months, d: age.days }, { y: 24, m: 5, d: 1 });
});

test('day borrowing across a short month', () => {
  // Born 1990-03-31, reference 1990-04-01 -> 0 years, 0 months, 1 day
  const age = calculateAge(1990, 3, 31, 1990, 4, 1);
  assert.deepStrictEqual({ y: age.years, m: age.months, d: age.days }, { y: 0, m: 0, d: 1 });
});

test('leap-year birthday Feb 29 one day before anniversary in non-leap year', () => {
  // Born 2000-02-29, reference 2024-02-28 (Feb 29 does not exist in 2024)
  // -> one day short of the 24th anniversary: 23 years, 11 months, 30 days
  const age = calculateAge(2000, 2, 29, 2024, 2, 28);
  assert.deepStrictEqual({ y: age.years, m: age.months, d: age.days }, { y: 23, m: 11, d: 30 });
});

test('leap-year birthday Feb 29 in a leap year', () => {
  // Born 2000-02-29, reference 2024-03-01 -> 24 years, 0 months, 1 day
  const age = calculateAge(2000, 2, 29, 2024, 3, 1);
  assert.deepStrictEqual({ y: age.years, m: age.months, d: age.days }, { y: 24, m: 0, d: 1 });
});

test('exactly zero age on the birthdate', () => {
  const age = calculateAge(2000, 1, 1, 2000, 1, 1);
  assert.deepStrictEqual({ y: age.years, m: age.months, d: age.days }, { y: 0, m: 0, d: 0 });
  assert.strictEqual(age.totalDays, 0);
});

test('totalDays matches calendar difference', () => {
  // 2024-01-01 to 2024-12-31 = 365 days (2024 is a leap year but both endpoints are within it)
  const age = calculateAge(2024, 1, 1, 2024, 12, 31);
  assert.strictEqual(age.totalDays, 365);
});

test('multi-year span totalDays', () => {
  // 1990-01-01 to 1991-01-01 = 365 days
  const age = calculateAge(1990, 1, 1, 1991, 1, 1);
  assert.strictEqual(age.totalDays, 365);
  assert.deepStrictEqual({ y: age.years, m: age.months, d: age.days }, { y: 1, m: 0, d: 0 });
});

test('formatted string uses singular forms', () => {
  const age = calculateAge(2000, 1, 1, 2001, 2, 2);
  assert.strictEqual(age.formatted, '1 year, 1 month, 1 day');
});

test('throws on invalid birthdate (month 13)', () => {
  assert.throws(() => calculateAge(1990, 13, 1), RangeError);
});

test('throws on invalid birthdate (Feb 30)', () => {
  assert.throws(() => calculateAge(1990, 2, 30), RangeError);
});

test('throws when reference date precedes birthdate', () => {
  // 1999-12-31 is one day before the 2000-01-01 birthdate
  assert.throws(() => calculateAge(2000, 1, 1, 1999, 12, 31), RangeError);
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
