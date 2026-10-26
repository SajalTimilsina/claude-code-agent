'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  getWeekday,
  isSameWeekday,
  daysUntilNextWeekday,
  isValidDate,
  daysInMonth,
  isLeapYear,
  WEEKDAY_NAMES,
} = require('../weekday.js');

// ---------------------------------------------------------------------------
// getWeekday — known dates
// ---------------------------------------------------------------------------

test('2024-01-01 is a Monday', () => {
  const wd = getWeekday(2024, 1, 1);
  assert.strictEqual(wd.index, 1);
  assert.strictEqual(wd.name, 'Monday');
});

test('2024-07-04 is a Thursday (US Independence Day)', () => {
  const wd = getWeekday(2024, 7, 4);
  assert.strictEqual(wd.index, 4);
  assert.strictEqual(wd.name, 'Thursday');
});

test('2000-02-29 is a Tuesday (leap day in a leap year)', () => {
  const wd = getWeekday(2000, 2, 29);
  assert.strictEqual(wd.index, 2);
  assert.strictEqual(wd.name, 'Tuesday');
});

test('1900-01-01 is a Monday (century non-leap year boundary)', () => {
  const wd = getWeekday(1900, 1, 1);
  assert.strictEqual(wd.index, 1);
  assert.strictEqual(wd.name, 'Monday');
});

test('2000-01-01 is a Saturday (century leap year boundary)', () => {
  // Year 2000 IS a leap year (divisible by 400), so Jan 1 2000 was a Saturday.
  const wd = getWeekday(2000, 1, 1);
  assert.strictEqual(wd.index, 6);
  assert.strictEqual(wd.name, 'Saturday');
});

test('2025-12-25 is a Thursday (Christmas 2025)', () => {
  const wd = getWeekday(2025, 12, 25);
  assert.strictEqual(wd.index, 4);
  assert.strictEqual(wd.name, 'Thursday');
});

test('1970-01-01 is a Thursday (Unix epoch)', () => {
  const wd = getWeekday(1970, 1, 1);
  assert.strictEqual(wd.index, 4);
  assert.strictEqual(wd.name, 'Thursday');
});

test('all seven weekdays appear across one week in 2024', () => {
  // 2024-01-01 Mon … 2024-01-07 Sun
  const expected = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  for (let i = 0; i < 7; i++) {
    const wd = getWeekday(2024, 1, 1 + i);
    assert.strictEqual(wd.name, expected[i], `Day ${i + 1}: expected ${expected[i]}, got ${wd.name}`);
    assert.strictEqual(wd.index, (1 + i) % 7);
  }
});

test('WEEKDAY_NAMES has exactly 7 entries starting with Sunday', () => {
  assert.strictEqual(WEEKDAY_NAMES.length, 7);
  assert.strictEqual(WEEKDAY_NAMES[0], 'Sunday');
  assert.strictEqual(WEEKDAY_NAMES[6], 'Saturday');
});

// ---------------------------------------------------------------------------
// getWeekday — error handling
// ---------------------------------------------------------------------------

test('throws on invalid date (month 13)', () => {
  assert.throws(() => getWeekday(2024, 13, 1), RangeError);
});

test('throws on invalid date (Feb 30)', () => {
  assert.throws(() => getWeekday(2024, 2, 30), RangeError);
});

test('throws on invalid date (year 0)', () => {
  assert.throws(() => getWeekday(0, 1, 1), RangeError);
});

test('throws on non-integer arguments', () => {
  assert.throws(() => getWeekday(2024.5, 1, 1), RangeError);
});

// ---------------------------------------------------------------------------
// isSameWeekday
// ---------------------------------------------------------------------------

test('isSameWeekday returns true for same weekday', () => {
  // 2024-01-01 Monday and 2024-01-08 Monday
  assert.ok(isSameWeekday(2024, 1, 1, 2024, 1, 8));
});

test('isSameWeekday returns false for different weekdays', () => {
  // 2024-01-01 Monday vs 2024-01-02 Tuesday
  assert.ok(!isSameWeekday(2024, 1, 1, 2024, 1, 2));
});

test('isSameWeekday works across years', () => {
  // 2024-07-04 Thursday and 2025-07-04 Friday -> false
  assert.ok(!isSameWeekday(2024, 7, 4, 2025, 7, 4));
  // 2024-07-04 Thursday and 2026-07-04 Saturday -> false
  assert.ok(!isSameWeekday(2024, 7, 4, 2026, 7, 4));
});

test('isSameWeekday throws on invalid date', () => {
  assert.throws(() => isSameWeekday(2024, 1, 1, 2024, 2, 30), RangeError);
});

// ---------------------------------------------------------------------------
// daysUntilNextWeekday
// ---------------------------------------------------------------------------

test('next Tuesday from Monday is 1 day away', () => {
  // 2024-01-01 is Monday; next Tuesday (index 2) is tomorrow
  assert.strictEqual(daysUntilNextWeekday(2024, 1, 1, 2), 1);
});

test('next Monday from Monday is 7 days away', () => {
  // Same weekday → always 7 days ahead (strictly after)
  assert.strictEqual(daysUntilNextWeekday(2024, 1, 1, 1), 7);
});

test('next Sunday from Monday is 6 days away', () => {
  // 2024-01-01 Monday → next Sunday (index 0) is 6 days later
  assert.strictEqual(daysUntilNextWeekday(2024, 1, 1, 0), 6);
});

test('next Friday from Wednesday is 2 days away', () => {
  // 2024-01-03 is Wednesday (index 3); next Friday (index 5) is 2 days later
  assert.strictEqual(daysUntilNextWeekday(2024, 1, 3, 5), 2);
});

test('result is always between 1 and 7', () => {
  // From any weekday, every target should yield 1..7
  const start = { y: 2024, m: 1, d: 1 }; // Monday
  for (let target = 0; target <= 6; target++) {
    const days = daysUntilNextWeekday(start.y, start.m, start.d, target);
    assert.ok(days >= 1 && days <= 7, `target=${target} gave ${days}`);
  }
});

test('throws on out-of-range targetWeekday', () => {
  assert.throws(() => daysUntilNextWeekday(2024, 1, 1, -1), RangeError);
  assert.throws(() => daysUntilNextWeekday(2024, 1, 1, 7), RangeError);
});

test('throws on non-integer targetWeekday', () => {
  assert.throws(() => daysUntilNextWeekday(2024, 1, 1, 2.5), RangeError);
});

test('throws on invalid date', () => {
  assert.throws(() => daysUntilNextWeekday(2024, 2, 30, 1), RangeError);
});

// ---------------------------------------------------------------------------
// Helper functions (shared pattern with other modules)
// ---------------------------------------------------------------------------

test('isValidDate accepts valid dates and rejects invalid ones', () => {
  assert.ok(isValidDate(2000, 2, 29));   // leap year
  assert.ok(!isValidDate(1900, 2, 29));  // century non-leap
  assert.ok(isValidDate(2024, 12, 31));
  assert.ok(!isValidDate(2024, 0, 1));
  assert.ok(!isValidDate(2024, 1, 0));
  assert.ok(!isValidDate(2024, 1, 32));
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
