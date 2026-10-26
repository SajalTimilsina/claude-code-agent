'use strict';

/**
 * Ordinal (day-of-year) calculator for Gregorian (AD) dates.
 *
 * Converts a date to its ordinal day number within the year (1 = Jan 1,
 * 365/366 = Dec 31), and converts an ordinal day number back to a calendar
 * date. The two operations are exact inverses of each other.
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

/** Total days in year `y` (365, or 366 for leap years). */
function daysInYear(y) {
  return isLeapYear(y) ? 366 : 365;
}

// Cumulative days before each month, for common (non-leap) years.
const DAYS_BEFORE_MONTH_COMMON = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Convert a date to its ordinal day number within the year.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @returns {{year:number, ordinal:number, daysInYear:number, formatted:string}}
 *   `ordinal` is 1-based (Jan 1 -> 1, Dec 31 -> 365 or 366). `daysInYear` is
 *   the total length of that year. `formatted` is a short human-readable
 *   string such as "day 233 of 365".
 * @throws {RangeError} if the date is invalid.
 */
function toOrdinalDate(y, m, d) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  const leap = isLeapYear(y);
  // Add one day for every full February that has already passed in a leap year.
  const febAdjust = (leap && m > 2) ? 1 : 0;
  const ordinal = DAYS_BEFORE_MONTH_COMMON[m - 1] + d + febAdjust;
  const diy = daysInYear(y);
  return {
    year: y,
    ordinal,
    daysInYear: diy,
    formatted: `day ${ordinal} of ${diy}`,
  };
}

/**
 * Convert an ordinal day number within a year back to a calendar date.
 *
 * @param {number} y Year (AD)
 * @param {number} ordinal 1-based day-of-year (1 .. 365/366 for the year)
 * @returns {{year:number, month:number, day:number, ordinal:number, formatted:string}}
 *   `formatted` is a short human-readable string such as "Aug 20, 2024".
 * @throws {RangeError} if the year is out of range or the ordinal is not a
 *   valid day-of-year for that year.
 */
function fromOrdinalDate(y, ordinal) {
  if (!Number.isInteger(y) || y < MIN_YEAR || y > MAX_YEAR) {
    throw new RangeError(`Invalid year: ${y}`);
  }
  const diy = daysInYear(y);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > diy) {
    throw new RangeError(`Invalid ordinal day: ${ordinal} (expected 1..${diy} for ${y})`);
  }

  const leap = isLeapYear(y);
  // Build per-month lengths for this year.
  const monthLengths = [];
  for (let m = 1; m <= 12; m++) monthLengths.push(daysInMonth(y, m));

  let remaining = ordinal;
  for (let m = 1; m <= 12; m++) {
    if (remaining <= monthLengths[m - 1]) {
      return {
        year: y,
        month: m,
        day: remaining,
        ordinal,
        formatted: `${MONTHS_SHORT[m - 1]} ${remaining}, ${y}`,
      };
    }
    remaining -= monthLengths[m - 1];
  }
  // Unreachable: ordinal was validated against daysInYear.
  throw new RangeError(`Invalid ordinal day: ${ordinal} (expected 1..${diy} for ${y})`);
}

module.exports = {
  toOrdinalDate,
  fromOrdinalDate,
  isValidDate,
  daysInMonth,
  isLeapYear,
  daysInYear,
};

// CLI entry point:
//   node ordinal-date.js --to YYYY-MM-DD          -> ordinal day number
//   node ordinal-date.js --from YYYY N            -> calendar date
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  const usage = () => {
    console.error('Usage:');
    console.error('  node ordinal-date.js --to YYYY-MM-DD     convert a date to its ordinal day');
    console.error('  node ordinal-date.js --from YYYY N       convert an ordinal day to a date');
    process.exit(1);
  };

  if (args.length < 2) usage();

  const mode = args[0];
  try {
    if (mode === '--to') {
      const dt = parse(args[1]);
      if (!dt) {
        console.error(`Invalid date "${args[1]}". Expected YYYY-MM-DD.`);
        process.exit(1);
      }
      const r = toOrdinalDate(dt[0], dt[1], dt[2]);
      console.log(`${dt.join('-')} is ${r.formatted} (${r.ordinal})`);
    } else if (mode === '--from') {
      const y = Number(args[1]);
      const n = Number(args[2]);
      if (!Number.isInteger(y) || !Number.isInteger(n)) {
        console.error(`Invalid arguments "${args[1]}" "${args[2]}". Expected YYYY and N.`);
        process.exit(1);
      }
      const r = fromOrdinalDate(y, n);
      console.log(`Day ${n} of ${y} is ${r.formatted} (${r.month}/${r.day}/${r.year})`);
    } else {
      usage();
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
