'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { formatAbsolute, formatRelative, isValidDate, daysInMonth, isLeapYear } = require('../dateFormat.js');

// --- formatAbsolute ---

test('absolute short month name', () => {
  assert.strictEqual(formatAbsolute(2024, 1, 5), 'Jan 5, 2024');
});

test('absolute long month name', () => {
  assert.strictEqual(formatAbsolute(2024, 1, 5, { long: true }), 'January 5, 2024');
});

test('absolute preserves single-digit day without padding', () => {
  assert.strictEqual(formatAbsolute(2023, 12, 31), 'Dec 31, 2023');
});

test('absolute throws on invalid date', () => {
  assert.throws(() => formatAbsolute(2023, 2, 30), RangeError);
  assert.throws(() => formatAbsolute(2023, 13, 1), RangeError);
});

// --- formatRelative ---

test('same day is today', () => {
  assert.strictEqual(formatRelative(2024, 8, 20, 2024, 8, 20), 'today');
});

test('one day ahead is tomorrow', () => {
  assert.strictEqual(formatRelative(2024, 8, 21, 2024, 8, 20), 'tomorrow');
});

test('one day behind is yesterday', () => {
  assert.strictEqual(formatRelative(2024, 8, 19, 2024, 8, 20), 'yesterday');
});

test('few days in the past', () => {
  // 2024-08-17 is 3 days before 2024-08-20
  assert.strictEqual(formatRelative(2024, 8, 17, 2024, 8, 20), '3 days ago');
});

test('few days in the future', () => {
  // 2024-08-23 is 3 days after 2024-08-20
  assert.strictEqual(formatRelative(2024, 8, 23, 2024, 8, 20), 'in 3 days');
});

test('single day uses singular', () => {
  assert.strictEqual(formatRelative(2024, 8, 19, 2024, 8, 20), 'yesterday');
  assert.strictEqual(formatRelative(2024, 8, 21, 2024, 8, 20), 'tomorrow');
});

test('weeks in the past', () => {
  // 2024-08-06 is 14 days before 2024-08-20 -> 2 weeks
  assert.strictEqual(formatRelative(2024, 8, 6, 2024, 8, 20), '2 weeks ago');
});

test('single week uses singular', () => {
  // 2024-08-13 is 7 days before 2024-08-20 -> 1 week
  assert.strictEqual(formatRelative(2024, 8, 13, 2024, 8, 20), '1 week ago');
});

test('months in the past', () => {
  // 2024-05-20 is ~92 days before 2024-08-20 -> floor(92/30.44)=3 months
  assert.strictEqual(formatRelative(2024, 5, 20, 2024, 8, 20), '3 months ago');
});

test('single month uses singular', () => {
  // 2024-07-20 is 31 days before 2024-08-20 -> floor(31/30.44)=1 month
  assert.strictEqual(formatRelative(2024, 7, 20, 2024, 8, 20), '1 month ago');
});

test('years in the past', () => {
  // 2021-08-20 is 1096 days before 2024-08-20 -> floor(1096/365.25)=3 years
  assert.strictEqual(formatRelative(2021, 8, 20, 2024, 8, 20), '3 years ago');
});

test('single year uses singular', () => {
  // 2023-08-20 is 366 days before 2024-08-20 -> floor(366/365.25)=1 year
  assert.strictEqual(formatRelative(2023, 8, 20, 2024, 8, 20), '1 year ago');
});

test('future months and years', () => {
  // 2024-11-20 is ~92 days after 2024-08-20 -> in 3 months
  assert.strictEqual(formatRelative(2024, 11, 20, 2024, 8, 20), 'in 3 months');
  // 2027-08-20 is 1095 days after 2024-08-20 (2024 & 2026 leap) -> in 2 years
  assert.strictEqual(formatRelative(2027, 8, 20, 2024, 8, 20), 'in 2 years');
});

test('leap-year span handled correctly', () => {
  // 2024-02-29 to 2024-03-01 is 1 day -> tomorrow
  assert.strictEqual(formatRelative(2024, 3, 1, 2024, 2, 29), 'tomorrow');
});

test('throws on invalid target date', () => {
  assert.throws(() => formatRelative(2024, 2, 30, 2024, 8, 20), RangeError);
});

test('throws on invalid reference date', () => {
  assert.throws(() => formatRelative(2024, 8, 20, 2024, 13, 1), RangeError);
});

// --- helpers (shared with other tools) ---

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
