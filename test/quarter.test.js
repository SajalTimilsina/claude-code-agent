'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { getQuarter, isValidDate, daysInMonth, isLeapYear } = require('../quarter.js');

// --- quarter identification ---

test('Q1 spans January through March', () => {
  for (const m of [1, 2, 3]) {
    const r = getQuarter(2024, m, 15);
    assert.strictEqual(r.quarter, 1);
    assert.strictEqual(r.label, 'Q1');
  }
});

test('Q2 spans April through June', () => {
  for (const m of [4, 5, 6]) {
    const r = getQuarter(2024, m, 15);
    assert.strictEqual(r.quarter, 2);
    assert.strictEqual(r.label, 'Q2');
  }
});

test('Q3 spans July through September', () => {
  for (const m of [7, 8, 9]) {
    const r = getQuarter(2024, m, 15);
    assert.strictEqual(r.quarter, 3);
    assert.strictEqual(r.label, 'Q3');
  }
});

test('Q4 spans October through December', () => {
  for (const m of [10, 11, 12]) {
    const r = getQuarter(2024, m, 15);
    assert.strictEqual(r.quarter, 4);
    assert.strictEqual(r.label, 'Q4');
  }
});

test('month boundaries map to the correct quarter', () => {
  // Last day of one quarter and first day of the next.
  assert.strictEqual(getQuarter(2024, 3, 31).label, 'Q1');
  assert.strictEqual(getQuarter(2024, 4, 1).label, 'Q2');
  assert.strictEqual(getQuarter(2024, 6, 30).label, 'Q2');
  assert.strictEqual(getQuarter(2024, 7, 1).label, 'Q3');
  assert.strictEqual(getQuarter(2024, 9, 30).label, 'Q3');
  assert.strictEqual(getQuarter(2024, 10, 1).label, 'Q4');
});

// --- quarter span (start / end) ---

test('reports the correct start and end dates for each quarter', () => {
  const cases = [
    [1, { month: 1, day: 1 }, { month: 3, day: 31 }],
    [2, { month: 4, day: 1 }, { month: 6, day: 30 }],
    [3, { month: 7, day: 1 }, { month: 9, day: 30 }],
    [4, { month: 10, day: 1 }, { month: 12, day: 31 }],
  ];
  for (const [q, s, e] of cases) {
    const r = getQuarter(2024, s.month, s.day);
    assert.strictEqual(r.start.month, s.month);
    assert.strictEqual(r.start.day, s.day);
    assert.strictEqual(r.end.month, e.month);
    assert.strictEqual(r.end.day, e.day);
  }
});

// --- days in quarter ---

test('Q1 has 91 days in a leap year and 90 in a common year', () => {
  assert.strictEqual(getQuarter(2024, 2, 29).daysInQuarter, 91); // leap
  assert.strictEqual(getQuarter(2023, 2, 28).daysInQuarter, 90); // common
});

test('other quarters have fixed lengths regardless of leap year', () => {
  // Q2 = 91 (Apr 30 + May 31 + Jun 30), Q3 = 92 (Jul 31 + Aug 31 + Sep 30),
  // Q4 = 92 (Oct 31 + Nov 30 + Dec 31).
  assert.strictEqual(getQuarter(2024, 5, 15).daysInQuarter, 91);
  assert.strictEqual(getQuarter(2024, 8, 15).daysInQuarter, 92);
  assert.strictEqual(getQuarter(2024, 11, 15).daysInQuarter, 92);
  assert.strictEqual(getQuarter(2023, 5, 15).daysInQuarter, 91);
  assert.strictEqual(getQuarter(2023, 8, 15).daysInQuarter, 92);
  assert.strictEqual(getQuarter(2023, 11, 15).daysInQuarter, 92);
});

// --- day into quarter ---

test('first day of a quarter is day 1', () => {
  assert.strictEqual(getQuarter(2024, 1, 1).dayIntoQuarter, 1);
  assert.strictEqual(getQuarter(2024, 4, 1).dayIntoQuarter, 1);
  assert.strictEqual(getQuarter(2024, 7, 1).dayIntoQuarter, 1);
  assert.strictEqual(getQuarter(2024, 10, 1).dayIntoQuarter, 1);
});

test('last day of a quarter equals its length', () => {
  assert.strictEqual(getQuarter(2024, 3, 31).dayIntoQuarter, 91); // leap Q1
  assert.strictEqual(getQuarter(2023, 3, 31).dayIntoQuarter, 90); // common Q1
  assert.strictEqual(getQuarter(2024, 6, 30).dayIntoQuarter, 91); // Q2
  assert.strictEqual(getQuarter(2024, 9, 30).dayIntoQuarter, 92); // Q3
  assert.strictEqual(getQuarter(2024, 12, 31).dayIntoQuarter, 92); // Q4
});

test('day-into-quarter accumulates across months within the quarter', () => {
  // 2024-08-20 in Q3: Jul (31) + Aug 20 = 51
  assert.strictEqual(getQuarter(2024, 8, 20).dayIntoQuarter, 51);
  // 2024-02-29 in Q1: Jan (31) + Feb 29 = 60
  assert.strictEqual(getQuarter(2024, 2, 29).dayIntoQuarter, 60);
  // 2023-02-28 in Q1: Jan (31) + Feb 28 = 59
  assert.strictEqual(getQuarter(2023, 2, 28).dayIntoQuarter, 59);
});

// --- error handling ---

test('throws on invalid date', () => {
  assert.throws(() => getQuarter(2023, 2, 30), RangeError);
  assert.throws(() => getQuarter(2023, 13, 1), RangeError);
  assert.throws(() => getQuarter(2023, 1, 0), RangeError);
});

test('throws on non-leap February 29', () => {
  assert.throws(() => getQuarter(2023, 2, 29), RangeError);
});

test('throws on out-of-range years', () => {
  assert.throws(() => getQuarter(0, 1, 1), RangeError);     // AD starts at year 1
  assert.throws(() => getQuarter(10000, 1, 1), RangeError); // beyond year 9999
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
