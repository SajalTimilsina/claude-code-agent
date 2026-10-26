'use strict';

/**
 * Ordinal-date converter for Gregorian (AD) dates.
 *
 * Converts between a calendar date (year / month / day) and its "ordinal" or
 * ISO day-of-year form: the 1-based position of the day within its year
 * (Jan 1 is day 1, Dec 31 is day 365 or 366).
 *
 * All arithmetic is done on UTC components only, so results are independent
 * of the machine's local time zone.
 */

const MIN_YEAR = 1; // AD year range we accept
const MAX_YEAR = 9999;

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
 * Convert a calendar date to its ordinal (day-of-year) number.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @returns {{year:number, dayOfYear:number, iso:string}}
 *   `dayOfYear` is 1-based; `iso` is the ISO ordinal notation, e.g. "2024-233".
 * @throws {RangeError} if the date is invalid.
 */
function toOrdinal(y, m, d) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  let dayOfYear = d;
  for (let mm = 1; mm < m; mm++) {
    dayOfYear += daysInMonth(y, mm);
  }
  return {
    year: y,
    dayOfYear,
    iso: `${y}-${dayOfYear}`,
  };
}

/**
 * Convert an ordinal (year + day-of-year) back to a calendar date.
 *
 * @param {number} y Year (AD)
 * @param {number} dayOfYear 1-based day within the year (1..365 or 1..366)
 * @returns {{year:number, month:number, day:number, iso:string}}
 *   `iso` is the ISO ordinal notation, e.g. "2024-233".
 * @throws {RangeError} if the year is out of range or the day is not valid for that year.
 */
function fromOrdinal(y, dayOfYear) {
  if (!Number.isInteger(y) || y < MIN_YEAR || y > MAX_YEAR) {
    throw new RangeError(`Invalid year: ${y}`);
  }
  const total = daysInYear(y);
  if (!Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > total) {
    throw new RangeError(`Invalid day of year: ${dayOfYear} (must be 1..${total} for ${y})`);
  }
  let remaining = dayOfYear;
  let month = 1;
  while (remaining > daysInMonth(y, month)) {
    remaining -= daysInMonth(y, month);
    month++;
  }
  return {
    year: y,
    month,
    day: remaining,
    iso: `${y}-${dayOfYear}`,
  };
}

module.exports = { toOrdinal, fromOrdinal, isValidDate, daysInMonth, daysInYear, isLeapYear };

// CLI entry point: node ordinalDate.js YYYY-MM-DD | node ordinalDate.js YYYY-DDD
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node ordinalDate.js <date:YYYY-MM-DD | ordinal:YYYY-DDD>');
    process.exit(1);
  }

  const input = args[0];
  let result;
  try {
    const cal = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input);
    const ord = /^(\d{4})-(\d{1,3})$/.exec(input);
    if (cal) {
      const o = toOrdinal(Number(cal[1]), Number(cal[2]), Number(cal[3]));
      const c = fromOrdinal(o.year, o.dayOfYear);
      result = `Calendar: ${o.iso.split('-')[0]}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}  ->  Ordinal: ${o.iso} (day ${o.dayOfYear} of ${daysInYear(o.year)})`;
    } else if (ord) {
      const f = fromOrdinal(Number(ord[1]), Number(ord[2]));
      result = `Ordinal: ${f.iso}  ->  Calendar: ${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`;
    } else {
      console.error(`Invalid input "${input}". Expected YYYY-MM-DD or YYYY-DDD.`);
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  console.log(result);
}
