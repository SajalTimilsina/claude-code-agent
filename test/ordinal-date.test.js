'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  toOrdinalDate,
  fromOrdinalDate,
  isValidDate,
  daysInMonth,
  isLeapYear,
  daysInYear,
} = require('../ordinal-date.js');

// --- toOrdinalDate: known dates ---

test('January 1st is always ordinal day 1', () => {
  assert.strictEqual(toOrdinalDate(2024, 1, 1).ordinal, 1);
  assert.strictEqual(toOrdinalDate(2023, 1, 1).ordinal, 1);
});

test('returns the correct ordinal for a mid-year date', () => {
  // 2024-08-20 in a leap year: Jan..Jul = 31+29+31+30+31+30+31 = 213; +20 = 233.
  const r = toOrdinalDate(2024, 8, 20);
  assert.strictEqual(r.ordinal, 233);
  assert.strictEqual(r.year, 2024);
  assert.strictEqual(r.daysInYear, 366);
  assert.strictEqual(r.formatted, 'day 233 of 366');
});

test('same calendar date has different ordinal in leap vs common year', () => {
  // Mar 1 falls after February, so it shifts by one between leap and common years.
  assert.strictEqual(toOrdinalDate(2024, 3, 1).ordinal, 61); // leap
  assert.strictEqual(toOrdinalDate(2023, 3, 1).ordinal, 60); // common
  // A date before March is unaffected by the leap day.
  assert.strictEqual(toOrdinalDate(2024, 2, 28).ordinal, 59);
  assert.strictEqual(toOrdinalDate(2023, 2, 28).ordinal, 59);
});

test('leap day (Feb 29) is ordinal 60 in a leap year', () => {
  assert.strictEqual(toOrdinalDate(2024, 2, 29).ordinal, 60);
});

test('December 31st is the last day of the year', () => {
  assert.strictEqual(toOrdinalDate(2024, 12, 31).ordinal, 366); // leap
  assert.strictEqual(toOrdinalDate(2023, 12, 31).ordinal, 365); // common
});

test('consecutive days advance the ordinal by one', () => {
  const a = toOrdinalDate(2024, 8, 19).ordinal;
  const b = toOrdinalDate(2024, 8, 20).ordinal;
  assert.strictEqual(b, a + 1);
});

// --- fromOrdinalDate: known ordinals ---

test('ordinal day 1 is January 1st', () => {
  const r = fromOrdinalDate(2024, 1);
  assert.strictEqual(r.month, 1);
  assert.strictEqual(r.day, 1);
  assert.strictEqual(r.formatted, 'Jan 1, 2024');
});

test('returns the correct date for a mid-year ordinal', () => {
  const r = fromOrdinalDate(2024, 233);
  assert.strictEqual(r.month, 8);
  assert.strictEqual(r.day, 20);
  assert.strictEqual(r.formatted, 'Aug 20, 2024');
});

test('last ordinal maps to December 31st', () => {
  assert.deepStrictEqual(
    { month: fromOrdinalDate(2024, 366).month, day: fromOrdinalDate(2024, 366).day },
    { month: 12, day: 31 }
  );
  assert.deepStrictEqual(
    { month: fromOrdinalDate(2023, 365).month, day: fromOrdinalDate(2023, 365).day },
    { month: 12, day: 31 }
  );
});

test('ordinal 60 differs across leap and common years', () => {
  // In a leap year day 60 is Feb 29; in a common year it is Mar 1.
  assert.deepStrictEqual(fromOrdinalDate(2024, 60), { ...fromOrdinalDate(2024, 60) });
  assert.strictEqual(fromOrdinalDate(2024, 60).month, 2);
  assert.strictEqual(fromOrdinalDate(2024, 60).day, 29);
  assert.strictEqual(fromOrdinalDate(2023, 60).month, 3);
  assert.strictEqual(fromOrdinalDate(2023, 60).day, 1);
});

// --- round-trip: to/from are exact inverses ---

test('toOrdinalDate then fromOrdinalDate returns the original date', () => {
  const samples = [
    [2024, 1, 1], [2024, 2, 29], [2024, 3, 1], [2024, 8, 20], [2024, 12, 31],
    [2023, 1, 1], [2023, 7, 4], [2023, 12, 31],
    [2000, 2, 29], [2000, 12, 31], // century leap year
    [1900, 2, 28], [1900, 12, 31], // century non-leap
  ];
  for (const [y, m, d] of samples) {
    const o = toOrdinalDate(y, m, d).ordinal;
    const back = fromOrdinalDate(y, o);
    assert.strictEqual(back.month, m, `round-trip month failed for ${y}-${m}-${d}`);
    assert.strictEqual(back.day, d, `round-trip day failed for ${y}-${m}-${d}`);
  }
});

test('every day of a leap year round-trips', () => {
  for (let n = 1; n <= 366; n++) {
    const dt = fromOrdinalDate(2024, n);
    const back = toOrdinalDate(2024, dt.month, dt.day).ordinal;
    assert.strictEqual(back, n, `round-trip failed at ordinal ${n}`);
  }
});

test('every day of a common year round-trips', () => {
  for (let n = 1; n <= 365; n++) {
    const dt = fromOrdinalDate(2023, n);
    const back = toOrdinalDate(2023, dt.month, dt.day).ordinal;
    assert.strictEqual(back, n, `round-trip failed at ordinal ${n}`);
  }
});

// --- error handling ---

test('toOrdinalDate throws on invalid date', () => {
  assert.throws(() => toOrdinalDate(2023, 2, 30), RangeError);
  assert.throws(() => toOrdinalDate(2023, 13, 1), RangeError);
  assert.throws(() => toOrdinalDate(2023, 1, 0), RangeError);
  assert.throws(() => toOrdinalDate(2023, 2, 29), RangeError); // non-leap
});

test('toOrdinalDate throws on out-of-range years', () => {
  assert.throws(() => toOrdinalDate(0, 1, 1), RangeError);     // AD starts at year 1
  assert.throws(() => toOrdinalDate(10000, 1, 1), RangeError); // beyond year 9999
});

test('fromOrdinalDate throws on invalid ordinal', () => {
  assert.throws(() => fromOrdinalDate(2024, 0), RangeError);   // below range
  assert.throws(() => fromOrdinalDate(2024, 367), RangeError); // above leap range
  assert.throws(() => fromOrdinalDate(2023, 366), RangeError); // above common range
  assert.throws(() => fromOrdinalDate(2024, 1.5), RangeError); // not an integer
});

test('fromOrdinalDate throws on out-of-range years', () => {
  assert.throws(() => fromOrdinalDate(0, 1), RangeError);
  assert.throws(() => fromOrdinalDate(10000, 1), RangeError);
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

test('daysInYear reflects leap status', () => {
  assert.strictEqual(daysInYear(2024), 366);
  assert.strictEqual(daysInYear(2023), 365);
  assert.strictEqual(daysInYear(2000), 366); // century leap
  assert.strictEqual(daysInYear(1900), 365); // century non-leap
});
