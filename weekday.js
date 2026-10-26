'use strict';

/**
 * Weekday calculator for Gregorian (AD) dates.
 *
 * Given a date, returns the day of the week it falls on — as a number (0 =
 * Sunday … 6 = Saturday), a short name ("Sun" … "Sat") and a long name
 * ("Sunday" … "Saturday").
 *
 * The weekday is computed with Zeller's congruence, which works directly on
 * calendar components and needs no time-zone or epoch arithmetic, so results
 * are independent of the machine's local time zone.
 */

const MIN_YEAR = 1; // AD year range we accept
const MAX_YEAR = 9999;

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

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

/**
 * Compute the weekday of a date.
 *
 * Uses Zeller's congruence. January and February are treated as months 13 and
 * 14 of the previous year, which is required for the formula to work.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @returns {{index:number, short:string, long:string}}
 *   `index` is 0 = Sunday through 6 = Saturday; `short`/`long` are the names.
 * @throws {RangeError} if the date is invalid.
 */
function weekday(y, m, d) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }

  let yy = y;
  let mm = m;
  if (mm <= 2) {
    mm += 12; // Jan/Feb count as months 13/14 of the prior year
    yy -= 1;
  }

  const century = Math.floor(yy / 100);
  const yearWithinCentury = yy % 100;

  // Zeller's congruence yields 0 = Saturday … 6 = Friday.
  const z = (d + Math.floor((13 * (mm + 1)) / 5) + yearWithinCentury +
    Math.floor(yearWithinCentury / 4) + Math.floor(century / 4) - 2 * century) % 7;

  // Convert to 0 = Sunday … 6 = Saturday.
  const index = (z + 6) % 7;

  return {
    index,
    short: WEEKDAYS_SHORT[index],
    long: WEEKDAYS_LONG[index],
  };
}

module.exports = { weekday, isValidDate, daysInMonth, isLeapYear };

// CLI entry point: node weekday.js YYYY-MM-DD
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 1) {
    console.error('Usage: node weekday.js <date:YYYY-MM-DD>');
    process.exit(1);
  }

  const dt = parse(args[0]);
  if (!dt) {
    console.error(`Invalid date "${args[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  try {
    const w = weekday(dt[0], dt[1], dt[2]);
    console.log(`${dt.join('-')} was a ${w.long} (${w.short}, index ${w.index})`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
