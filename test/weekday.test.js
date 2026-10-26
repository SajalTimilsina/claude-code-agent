'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { weekday, isValidDate, daysInMonth, isLeapYear } = require('../weekday.js');

// --- weekday: known dates ---

test('returns the correct weekday for a mid-year date', () => {
  // 2024-08-20 is a Tuesday
  const w = weekday(2024, 8, 20);
  assert.strictEqual(w.index, 2);
  assert.strictEqual(w.short, 'Tue');
  assert.strictEqual(w.long, 'Tuesday');
});

test('Sunday is index 0', () => {
  // 2025-06-15 is a Sunday
  const w = weekday(2025, 6, 15);
  assert.strictEqual(w.index, 0);
  assert.strictEqual(w.short, 'Sun');
  assert.strictEqual(w.long, 'Sunday');
});

test('Saturday is index 6', () => {
  // 2026-02-28 is a Saturday
  const w = weekday(2026, 2, 28);
  assert.strictEqual(w.index, 6);
  assert.strictEqual(w.short, 'Sat');
  assert.strictEqual(w.long, 'Saturday');
});

test('handles leap-day birthdays', () => {
  // 2000-02-29 (leap day) is a Tuesday; 2024-02-29 is a Thursday
  assert.strictEqual(weekday(2000, 2, 29).long, 'Tuesday');
  assert.strictEqual(weekday(2024, 2, 29).long, 'Thursday');
});

test('handles year boundaries', () => {
  // 2024-12-31 is a Tuesday; 2025-01-01 is a Wednesday
  assert.strictEqual(weekday(2024, 12, 31).long, 'Tuesday');
  assert.strictEqual(weekday(2025, 1, 1).long, 'Wednesday');
});

test('handles century boundary correctly (Zeller edge case)', () => {
  // 1900-01-01 is a Monday; 1900-02-28 is a Wednesday; 2000-03-01 is a Wednesday.
  // These straddle the 1900/2000 century leap rules that Zeller's formula
  // must get right.
  assert.strictEqual(weekday(1900, 1, 1).long, 'Monday');
  assert.strictEqual(weekday(1900, 2, 28).long, 'Wednesday');
  assert.strictEqual(weekday(2000, 3, 1).long, 'Wednesday');
});

test('January and February use the prior year in Zeller arithmetic', () => {
  // Jan/Feb are treated as months 13/14 of the previous year internally.
  // Verify results still match across those months.
  assert.strictEqual(weekday(2024, 1, 1).long, 'Monday');   // New Year's Day 2024
  assert.strictEqual(weekday(2024, 2, 1).long, 'Thursday'); // Feb 1 2024
});

test('matches the Unix epoch weekday', () => {
  // 1970-01-01 was a Thursday
  assert.strictEqual(weekday(1970, 1, 1).long, 'Thursday');
});

test('index is always in range 0..6', () => {
  for (let d = 1; d <= 28; d++) {
    const w = weekday(2024, 1, d);
    assert.ok(w.index >= 0 && w.index <= 6, `index out of range on day ${d}`);
  }
});

test('consecutive days advance by one weekday', () => {
  // Walking through a week should cycle the index forward by 1 each day.
  const start = weekday(2024, 8, 19); // Monday
  assert.strictEqual(start.index, 1);
  const next = weekday(2024, 8, 20);  // Tuesday
  assert.strictEqual(next.index, (start.index + 1) % 7);
});

// --- error handling ---

test('throws on invalid date', () => {
  assert.throws(() => weekday(2023, 2, 30), RangeError);
  assert.throws(() => weekday(2023, 13, 1), RangeError);
  assert.throws(() => weekday(2023, 1, 0), RangeError);
});

test('throws on non-leap February 29', () => {
  assert.throws(() => weekday(2023, 2, 29), RangeError);
});

test('throws on out-of-range years', () => {
  assert.throws(() => weekday(0, 1, 1), RangeError);     // AD starts at year 1
  assert.throws(() => weekday(10000, 1, 1), RangeError); // beyond year 9999
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
