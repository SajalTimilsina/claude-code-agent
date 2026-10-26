'use strict';

/**
 * Weekday calculator for Gregorian (AD) dates.
 *
 * Given a date, returns the day of the week (0 = Sunday … 6 = Saturday)
 * using the Sakamoto algorithm — a pure integer-arithmetic formula that
 * needs no tables and works for any year in the accepted AD range.
 *
 * All arithmetic is done on UTC components only, so results are independent
 * of the machine's local time zone.
 */

const MIN_YEAR = 1; // AD year range we accept
const MAX_YEAR = 9999;

const WEEKDAY_NAMES = [
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
 * Compute the day of the week for a Gregorian date.
 *
 * Uses the Sakamoto algorithm: a closed-form expression over the year,
 * month and day that yields 0 (Sunday) through 6 (Saturday).
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @returns {{index:number, name:string}} index is 0=Sunday…6=Saturday;
 *          name is the English weekday name.
 * @throws {RangeError} if the date is invalid.
 */
function getWeekday(y, m, d) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]; // month offsets
  const yy = m < 3 ? y - 1 : y;
  const w = (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
  return { index: w, name: WEEKDAY_NAMES[w] };
}

/**
 * Check whether two dates fall on the same weekday.
 *
 * @param {number} y1 Year of first date
 * @param {number} m1 Month of first date
 * @param {number} d1 Day of first date
 * @param {number} y2 Year of second date
 * @param {number} m2 Month of second date
 * @param {number} d2 Day of second date
 * @returns {boolean}
 * @throws {RangeError} if either date is invalid.
 */
function isSameWeekday(y1, m1, d1, y2, m2, d2) {
  return getWeekday(y1, m1, d1).index === getWeekday(y2, m2, d2).index;
}

/**
 * Return the number of days until the next occurrence of a given weekday
 * strictly after the supplied date.
 *
 * Example: if 2024-01-01 is a Monday, daysUntilNextWeekday(2024,1,1, 2)
 * returns 1 (Tuesday is the next day).
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} targetWeekday 0=Sunday … 6=Saturday
 * @returns {number} 1–7 (always at least one day ahead)
 * @throws {RangeError} if the date is invalid or targetWeekday is out of range.
 */
function daysUntilNextWeekday(y, m, d, targetWeekday) {
  if (!Number.isInteger(targetWeekday) || targetWeekday < 0 || targetWeekday > 6) {
    throw new RangeError(`targetWeekday must be an integer 0-6, got ${targetWeekday}`);
  }
  const current = getWeekday(y, m, d).index;
  const delta = (targetWeekday - current + 7) % 7;
  return delta === 0 ? 7 : delta;
}

module.exports = {
  getWeekday,
  isSameWeekday,
  daysUntilNextWeekday,
  isValidDate,
  daysInMonth,
  isLeapYear,
  WEEKDAY_NAMES,
};

// CLI entry point: node weekday.js YYYY-MM-DD [--next WEEKDAY_INDEX]
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 1) {
    console.error('Usage: node weekday.js <date:YYYY-MM-DD> [--next WEEKDAY_INDEX]');
    process.exit(1);
  }

  const dt = parse(args[0]);
  if (!dt) {
    console.error(`Invalid date "${args[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  try {
    const wd = getWeekday(dt[0], dt[1], dt[2]);
    console.log(`${dt.join('-')} is a ${wd.name} (index ${wd.index})`);

    if (args.includes('--next')) {
      const idx = args.indexOf('--next');
      const target = Number(args[idx + 1]);
      if (Number.isNaN(target)) {
        console.error(`Invalid --next value "${args[idx + 1]}". Expected 0-6.`);
        process.exit(1);
      }
      const days = daysUntilNextWeekday(dt[0], dt[1], dt[2], target);
      const targetName = WEEKDAY_NAMES[target];
      console.log(`Next ${targetName}: in ${days} day${days === 1 ? '' : 's'}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
