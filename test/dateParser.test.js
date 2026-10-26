'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  parseDate,
  isValidDateString,
  formatDate,
  isValidDate,
  daysInMonth,
  isLeapYear,
} = require('../dateParser.js');

// ---------------------------------------------------------------------------
// parseDate — ISO format (YYYY-MM-DD)
// ---------------------------------------------------------------------------

test('parses ISO date with zero-padded components', () => {
  const r = parseDate('2024-07-04');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
  assert.strictEqual(r.format, 'iso');
});

test('parses ISO date without zero-padding', () => {
  const r = parseDate('2024-7-4');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
});

test('parses ISO date at year boundaries', () => {
  const r1 = parseDate('0001-01-01');
  assert.deepStrictEqual({ y: r1.year, m: r1.month, d: r1.day }, { y: 1, m: 1, d: 1 });

  const r2 = parseDate('9999-12-31');
  assert.deepStrictEqual({ y: r2.year, m: r2.month, d: r2.day }, { y: 9999, m: 12, d: 31 });
});

// ---------------------------------------------------------------------------
// parseDate — US numeric (MM/DD/YYYY)
// ---------------------------------------------------------------------------

test('parses US numeric date', () => {
  const r = parseDate('07/04/2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
  assert.strictEqual(r.format, 'us-numeric');
});

test('parses US numeric date without zero-padding', () => {
  const r = parseDate('7/4/2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
});

test('parses US numeric leap day', () => {
  const r = parseDate('02/29/2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 2, d: 29 });
});

// ---------------------------------------------------------------------------
// parseDate — EU numeric (DD.MM.YYYY)
// ---------------------------------------------------------------------------

test('parses EU numeric date', () => {
  const r = parseDate('04.07.2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
  assert.strictEqual(r.format, 'eu-numeric');
});

test('parses EU numeric date without zero-padding', () => {
  const r = parseDate('4.7.2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
});

// ---------------------------------------------------------------------------
// parseDate — Long month name ("July 4, 2024")
// ---------------------------------------------------------------------------

test('parses long month name with comma', () => {
  const r = parseDate('July 4, 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
  assert.strictEqual(r.format, 'long-month');
});

test('parses long month name without comma', () => {
  const r = parseDate('July 4 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
});

test('parses all twelve months by long name', () => {
  const names = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  for (let i = 0; i < 12; i++) {
    const r = parseDate(`${names[i]} 15, 2024`);
    assert.strictEqual(r.month, i + 1, `${names[i]} should be month ${i + 1}`);
  }
});

test('parses long month name case-insensitively', () => {
  const r = parseDate('july 4, 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
});

// ---------------------------------------------------------------------------
// parseDate — Short month name ("Jul 4, 2024")
// ---------------------------------------------------------------------------

test('parses short month name with comma', () => {
  const r = parseDate('Jul 4, 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
  assert.strictEqual(r.format, 'short-month');
});

test('parses short month name without comma', () => {
  const r = parseDate('Jan 1 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 1, d: 1 });
});

test('parses all twelve months by short name', () => {
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 12; i++) {
    const r = parseDate(`${names[i]} 15, 2024`);
    assert.strictEqual(r.month, i + 1, `${names[i]} should be month ${i + 1}`);
  }
});

// ---------------------------------------------------------------------------
// parseDate — Day-first formats
// ---------------------------------------------------------------------------

test('parses day-first long month name', () => {
  const r = parseDate('4 July 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
  assert.strictEqual(r.format, 'day-first-long');
});

test('parses day-first short month name', () => {
  const r = parseDate('4 Jul 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
  assert.strictEqual(r.format, 'day-first-short');
});

test('parses day-first with comma', () => {
  const r = parseDate('4 July, 2024');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
});

// ---------------------------------------------------------------------------
// parseDate — whitespace handling
// ---------------------------------------------------------------------------

test('trims leading and trailing whitespace', () => {
  const r = parseDate('  2024-07-04  ');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 7, d: 4 });
});

// ---------------------------------------------------------------------------
// parseDate — error cases
// ---------------------------------------------------------------------------

test('throws on unrecognized format', () => {
  assert.throws(() => parseDate('not a date'), RangeError);
});

test('throws on empty string', () => {
  assert.throws(() => parseDate(''), RangeError);
});

test('throws on non-string input', () => {
  assert.throws(() => parseDate(20240704), RangeError);
  assert.throws(() => parseDate(null), RangeError);
  assert.throws(() => parseDate(undefined), RangeError);
});

test('throws on invalid calendar date (Feb 30)', () => {
  assert.throws(() => parseDate('2024-02-30'), RangeError);
});

test('throws on invalid calendar date (month 13)', () => {
  assert.throws(() => parseDate('2024-13-01'), RangeError);
});

test('throws on invalid calendar date (US format Feb 30)', () => {
  assert.throws(() => parseDate('02/30/2024'), RangeError);
});

test('throws on unknown month name', () => {
  assert.throws(() => parseDate('Foo 4, 2024'), RangeError);
});

test('throws on year 0 (AD starts at 1)', () => {
  assert.throws(() => parseDate('0000-01-01'), RangeError);
});

test('throws on leap day in non-leap year', () => {
  assert.throws(() => parseDate('2023-02-29'), RangeError);
});

test('accepts leap day in leap year', () => {
  const r = parseDate('2024-02-29');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2024, m: 2, d: 29 });
});

test('rejects leap day in century non-leap year', () => {
  assert.throws(() => parseDate('1900-02-29'), RangeError);
});

test('accepts leap day in century leap year', () => {
  const r = parseDate('2000-02-29');
  assert.deepStrictEqual({ y: r.year, m: r.month, d: r.day }, { y: 2000, m: 2, d: 29 });
});

// ---------------------------------------------------------------------------
// isValidDateString
// ---------------------------------------------------------------------------

test('isValidDateString returns true for valid dates', () => {
  assert.ok(isValidDateString('2024-07-04'));
  assert.ok(isValidDateString('07/04/2024'));
  assert.ok(isValidDateString('July 4, 2024'));
  assert.ok(isValidDateString('4 Jul 2024'));
});

test('isValidDateString returns false for invalid dates', () => {
  assert.ok(!isValidDateString(''));
  assert.ok(!isValidDateString('not a date'));
  assert.ok(!isValidDateString('2024-02-30'));
  assert.ok(!isValidDateString('2024-13-01'));
});

test('isValidDateString returns false for non-string input', () => {
  assert.ok(!isValidDateString(null));
  assert.ok(!isValidDateString(42));
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

test('formats date object as ISO string', () => {
  assert.strictEqual(formatDate({ year: 2024, month: 7, day: 4 }), '2024-07-04');
});

test('formats single-digit month and day with padding', () => {
  assert.strictEqual(formatDate({ year: 2024, month: 1, day: 5 }), '2024-01-05');
});

test('formats year with padding', () => {
  assert.strictEqual(formatDate({ year: 1, month: 1, day: 1 }), '0001-01-01');
});

test('throws on invalid date object', () => {
  assert.throws(() => formatDate({ year: 2024, month: 13, day: 1 }), RangeError);
  assert.throws(() => formatDate({ year: 2024, month: 2, day: 30 }), RangeError);
});

test('throws on null or undefined input', () => {
  assert.throws(() => formatDate(null), RangeError);
  assert.throws(() => formatDate(undefined), RangeError);
});

test('round-trip: parse then format returns original ISO string', () => {
  const originals = [
    '2024-07-04',
    '2024-01-05',
    '0001-01-01',
    '9999-12-31',
  ];
  for (const iso of originals) {
    const parsed = parseDate(iso);
    assert.strictEqual(formatDate(parsed), iso);
  }
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
