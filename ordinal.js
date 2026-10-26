'use strict';

/**
 * Ordinal (day-of-year) date utilities for Gregorian (AD) dates.
 *
 * An ordinal date writes a year with the day number within that year,
 * e.g. `2024-322` for December 19, 2024. This module converts between
 * calendar dates and ordinal form in both directions:
 *
 *   - `dayOfYear(y, m, d)`      -> the day number (1-365 or 1-366)
 *   - `formatOrdinal(y, m, d)`  -> "YYYY-DDD" string (zero-padded)
 *   - `fromOrdinal(y, n)`       -> { month, day } for day number n of y
 *
 * All arithmetic is done on calendar components only, so results are
 * independent of the machine's local time zone.
 */

const MIN_YEAR = 1; // AD year range we accept
const MAX_YEAR = 9999;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** True when y/m/d form a real Gregorian calendar date. */
function isValidDate(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < MIN_YEAR || y > MAX_YEAR) return false;
  if (m < 1 || m > 12) return false;
  const dim = daysInMonth(y, m);
  return d >= 1 && d <= dim;
}

/** Number of days in month `m` (1-12) of year `y`, accounting for leap years. */
function daysInMonth(y, m) {
  switch (m) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(y) ? 29 : 28;
    default:
      return 0;
  }
}

/** Gregorian leap-year rule. */
function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Total days in year `y` (365 or 366). */
function daysInYear(y) {
  return isLeapYear(y) ? 366 : 365;
}

/**
 * The day of the year for a calendar date (1 = January 1 … 365/366 = Dec 31).
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @returns {number}
 * @throws {RangeError} if the date is invalid.
 */
function dayOfYear(y, m, d) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  let n = d;
  for (let i = 1; i < m; i++) n += daysInMonth(y, i);
  return n;
}

/**
 * Format a date as an ordinal (ISO-like) string "YYYY-DDD", zero-padded.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @returns {string} e.g. "2024-005"
 * @throws {RangeError} if the date is invalid.
 */
function formatOrdinal(y, m, d) {
  const n = dayOfYear(y, m, d);
  return `${String(y).padStart(4, '0')}-${String(n).padStart(3, '0')}`;
}

/**
 * Convert an ordinal day number back to its month and day.
 *
 * @param {number} y Year (AD)
 * @param {number} n Day number within the year (1-365 or 1-366)
 * @returns {{month:number, day:number}}
 * @throws {RangeError} if the year is out of range or `n` is not a valid
 *         day number for that year.
 */
function fromOrdinal(y, n) {
  if (!Number.isInteger(y) || y < MIN_YEAR || y > MAX_YEAR) {
    throw new RangeError(`Invalid year: ${y}`);
  }
  const total = daysInYear(y);
  if (!Number.isInteger(n) || n < 1 || n > total) {
    throw new RangeError(`Invalid day number ${n} for year ${y} (1-${total})`);
  }
  let remaining = n;
  for (let m = 1; m <= 12; m++) {
    const dim = daysInMonth(y, m);
    if (remaining <= dim) return { month: m, day: remaining };
    remaining -= dim;
  }
  // Unreachable: n was validated against daysInYear(y).
  throw new RangeError(`Invalid day number ${n} for year ${y}`);
}

module.exports = {
  dayOfYear,
  formatOrdinal,
  fromOrdinal,
  isValidDate,
  daysInMonth,
  daysInYear,
  isLeapYear,
};

// CLI entry point: node ordinal.js YYYY-MM-DD
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 1) {
    console.error('Usage: node ordinal.js <date:YYYY-MM-DD>');
    process.exit(1);
  }

  const dt = parse(args[0]);
  if (!dt) {
    console.error(`Invalid date "${args[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  try {
    const [y, m, d] = dt;
    const n = dayOfYear(y, m, d);
    const total = daysInYear(y);
    const left = total - n + 1; // inclusive count of this day through Dec 31
    console.log(`Day of year: ${n} of ${total} (${left} day${left === 1 ? '' : 's'} left in ${y})`);
    console.log(`Ordinal: ${formatOrdinal(y, m, d)}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
