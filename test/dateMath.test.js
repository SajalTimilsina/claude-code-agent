'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  addDays, addMonths, nextWeekday, businessDaysBetween,
  weekdayIndex, isValidDate, daysInMonth, isLeapYear, WEEKDAYS,
} = require('../dateMath.js');

// --- addDays ---

test('addDays across month and year boundaries', () => {
  assert.deepStrictEqual(addDays(2024, 1, 31, 1), { year: 2024, month: 2, day: 1 });
  assert.deepStrictEqual(addDays(2024, 12, 31, 1), { year: 2025, month: 1, day: 1 });
});

test('addDays with negative delta goes back in time', () => {
  assert.deepStrictEqual(addDays(2024, 3, 1, -1), { year: 2024, month: 2, day: 29 }); // leap Feb
  assert.deepStrictEqual(addDays(2023, 3, 1, -1), { year: 2023, month: 2, day: 28 });
  assert.deepStrictEqual(addDays(2024, 1, 1, -1), { year: 2023, month: 12, day: 31 });
});

test('addDays zero is the identity', () => {
  assert.deepStrictEqual(addDays(2024, 8, 20, 0), { year: 2024, month: 8, day: 20 });
});

test('addDays matches Date.UTC over a span of dates', () => {
  for (let n = -30; n <= 30; n++) {
    const r = addDays(2024, 2, 27, n);
    const js = new Date(Date.UTC(2024, 1, 27) + n * 86400000);
    assert.deepStrictEqual(r, {
      year: js.getUTCFullYear(),
      month: js.getUTCMonth() + 1,
      day: js.getUTCDate(),
    }, `delta ${n}`);
  }
});

test('addDays rejects invalid input', () => {
  assert.throws(() => addDays(2023, 2, 29, 1), RangeError);   // bad date
  assert.throws(() => addDays(2024, 1, 1, 1.5), RangeError);  // non-integer delta
  assert.throws(() => addDays(2024, 1, 1, 'x'), RangeError);
});

// --- addMonths ---

test('addMonths plain addition', () => {
  assert.deepStrictEqual(addMonths(2024, 1, 15, 3), { year: 2024, month: 4, day: 15 });
  assert.deepStrictEqual(addMonths(2024, 11, 15, 3), { year: 2025, month: 2, day: 15 });
});

test('addMonths clamps to end of shorter target month', () => {
  assert.deepStrictEqual(addMonths(2023, 1, 31, 1), { year: 2023, month: 2, day: 28 });
  assert.deepStrictEqual(addMonths(2024, 1, 31, 1), { year: 2024, month: 2, day: 29 }); // leap
  assert.deepStrictEqual(addMonths(2024, 3, 31, 1), { year: 2024, month: 4, day: 30 });
});

test('addMonths with negative delta', () => {
  assert.deepStrictEqual(addMonths(2024, 3, 31, -1), { year: 2024, month: 2, day: 29 });
  assert.deepStrictEqual(addMonths(2024, 2, 29, -1), { year: 2024, month: 1, day: 29 });
  assert.deepStrictEqual(addMonths(2024, 1, 15, -1), { year: 2023, month: 12, day: 15 });
});

test('addMonths zero is the identity', () => {
  assert.deepStrictEqual(addMonths(2024, 2, 29, 0), { year: 2024, month: 2, day: 29 });
});

test('addMonths rejects invalid input', () => {
  assert.throws(() => addMonths(2023, 2, 29, 1), RangeError);  // bad date
  assert.throws(() => addMonths(2024, 1, 1, 0.5), RangeError); // non-integer delta
});

// --- nextWeekday ---

test('nextWeekday skips to the requested weekday', () => {
  // Jan 5, 2024 was a Friday.
  assert.deepStrictEqual(nextWeekday(2024, 1, 5, 0), { year: 2024, month: 1, day: 7 }); // Sunday
  assert.deepStrictEqual(nextWeekday(2024, 1, 5, 1), { year: 2024, month: 1, day: 8 }); // Monday
  assert.deepStrictEqual(nextWeekday(2024, 1, 5, 5), { year: 2024, month: 1, day: 12 }); // next Friday
});

test('nextWeekday wraps around the week boundary', () => {
  // Saturday Jan 6, 2024 -> next Saturday is Jan 13.
  assert.deepStrictEqual(nextWeekday(2024, 1, 6, 6), { year: 2024, month: 1, day: 13 });
  // Sunday Jan 7, 2024 -> next Sunday is Jan 14.
  assert.deepStrictEqual(nextWeekday(2024, 1, 7, 0), { year: 2024, month: 1, day: 14 });
});

test('nextWeekday non-strict returns the same date when it already matches', () => {
  // Jan 5, 2024 is a Friday.
  assert.deepStrictEqual(nextWeekday(2024, 1, 5, 5, { strict: false }), { year: 2024, month: 1, day: 5 });
  // ...but strict (default) still advances to the next one.
  assert.deepStrictEqual(nextWeekday(2024, 1, 5, 5), { year: 2024, month: 1, day: 12 });
});

test('nextWeekday crosses month boundaries', () => {
  // Jan 31, 2024 was a Wednesday; next Monday is Feb 5, 2024.
  assert.deepStrictEqual(nextWeekday(2024, 1, 31, 1), { year: 2024, month: 2, day: 5 });
});

test('nextWeekday rejects out-of-range weekday', () => {
  assert.throws(() => nextWeekday(2024, 1, 5, 7), RangeError);
  assert.throws(() => nextWeekday(2024, 1, 5, -1), RangeError);
});

// --- businessDaysBetween ---

test('business days within a single week', () => {
  // Mon Jan 8, 2024 .. Fri Jan 12, 2024 (half-open): Mon-Thu counted = 4.
  assert.strictEqual(businessDaysBetween(2024, 1, 8, 2024, 1, 12), 4);
  // Mon Jan 8 .. Sat Jan 13: Mon-Fri counted = 5.
  assert.strictEqual(businessDaysBetween(2024, 1, 8, 2024, 1, 13), 5);
});

test('weekend-only span has zero business days', () => {
  // Sat Jan 13 .. Sun Jan 14 (exclusive) = only Saturday.
  assert.strictEqual(businessDaysBetween(2024, 1, 13, 2024, 1, 14), 0);
});

test('equal or reversed dates give zero', () => {
  assert.strictEqual(businessDaysBetween(2024, 1, 8, 2024, 1, 8), 0);
  assert.strictEqual(businessDaysBetween(2024, 1, 12, 2024, 1, 8), 0);
});

test('exact weeks contribute five business days each', () => {
  // Three full weeks from Mon Jan 8, 2024 -> Mon Jan 29, 2024.
  assert.strictEqual(businessDaysBetween(2024, 1, 8, 2024, 1, 29), 15);
});

test('span starting mid-week counts correctly', () => {
  // Wed Jan 10 .. Tue Jan 16 (exclusive): Wed, Thu, Fri, Mon = 4.
  assert.strictEqual(businessDaysBetween(2024, 1, 10, 2024, 1, 16), 4);
});

test('longer span spanning multiple months', () => {
  // Mon Jan 8, 2024 .. Mon Apr 1, 2024: 12 full weeks (84 days) -> 60 business days.
  assert.strictEqual(businessDaysBetween(2024, 1, 8, 2024, 4, 1), 60);
});

test('businessDaysBetween rejects invalid dates', () => {
  assert.throws(() => businessDaysBetween(2023, 2, 29, 2024, 1, 1), RangeError);
  assert.throws(() => businessDaysBetween(2024, 1, 1, 2024, 13, 1), RangeError);
});

// --- helpers ---

test('weekdayIndex agrees with JS Date for a sample of dates', () => {
  for (let y = 2020; y <= 2026; y += 2) {
    for (const m of [1, 2, 7, 12]) {
      for (const d of [1, 15, 28]) {
        const got = weekdayIndex(y, m, d);
        const want = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        assert.strictEqual(got, want, `${y}-${m}-${d}`);
      }
    }
  }
});

test('WEEKDAYS export lists all seven names starting at Sunday', () => {
  assert.deepStrictEqual(WEEKDAYS, [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday',
  ]);
});
