'use strict';

/**
 * Date formatter for Gregorian (AD) dates.
 *
 * Converts a date into human-friendly strings, in two styles:
 *   - "relative":  compared to a reference date -> "today", "yesterday",
 *                  "3 days ago", "in 2 weeks", "5 months from now"
 *   - "absolute":  fixed calendar rendering     -> "Jan 5, 2024" or
 *                  "January 5, 2024"
 *
 * All arithmetic is done on UTC components only, so results are independent
 * of the machine's local time zone.
 */

const MIN_YEAR = 1; // AD year range we accept
const MAX_YEAR = 9999;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
 * Format a date as an absolute string.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {{long?:boolean}} [opts] When `long` is true, use full month names.
 * @returns {string} e.g. "Jan 5, 2024" or "January 5, 2024"
 * @throws {RangeError} if the date is invalid.
 */
function formatAbsolute(y, m, d, opts = {}) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  const monthName = opts.long ? MONTHS_LONG[m - 1] : MONTHS_SHORT[m - 1];
  return `${monthName} ${d}, ${y}`;
}

/**
 * Format a date relative to a reference date.
 *
 * The span is expressed in the largest sensible unit:
 *   - same day            -> "today"
 *   - 1 day               -> "yesterday" / "tomorrow"
 *   - < 7 days            -> "N days ago" / "in N days"
 *   - < 30 days           -> "N week(s) ago" / "in N week(s)"
 *   - < 12 months         -> "N month(s) ago" / "in N month(s)"
 *   - otherwise           -> "N year(s) ago" / "in N year(s)"
 *
 * Weeks/months/years use whole-unit floor division of the day difference
 * against representative lengths (7 / ~30.44 / ~365.25 days), which is the
 * common convention for casual relative formatting.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} [ry] Reference year   (defaults to today)
 * @param {number} [rm] Reference month  (defaults to today)
 * @param {number} [rd] Reference day    (defaults to today)
 * @returns {string}
 * @throws {RangeError} if either date is invalid.
 */
function formatRelative(y, m, d, ry, rm, rd) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  if (ry === undefined || rm === undefined || rd === undefined) {
    const now = new Date();
    ry = now.getUTCFullYear();
    rm = now.getUTCMonth() + 1;
    rd = now.getUTCDate();
  }
  if (!isValidDate(ry, rm, rd)) {
    throw new RangeError(`Invalid reference date: ${ry}-${rm}-${rd}`);
  }

  const target = Date.UTC(y, m - 1, d);
  const ref = Date.UTC(ry, rm - 1, rd);
  const diffDays = Math.round((target - ref) / 86400000); // +future, -past

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';

  const future = diffDays > 0;
  const n = Math.abs(diffDays);

  let unit, count;
  if (n < 7) {
    unit = 'day';
    count = n;
  } else if (n < 30) {
    unit = 'week';
    count = Math.floor(n / 7);
  } else if (n < 365) {
    unit = 'month';
    count = Math.floor(n / 30.44);
  } else {
    unit = 'year';
    count = Math.floor(n / 365.25);
  }

  const suffix = count === 1 ? '' : 's';
  const phrase = `${count} ${unit}${suffix}`;
  return future ? `in ${phrase}` : `${phrase} ago`;
}

module.exports = { formatAbsolute, formatRelative, isValidDate, daysInMonth, isLeapYear };

// CLI entry point: node dateFormat.js YYYY-MM-DD [--ref YYYY-MM-DD] [--long]
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  const positional = [];
  let refArg = null;
  let long = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ref') {
      refArg = args[++i];
    } else if (args[i] === '--long') {
      long = true;
    } else {
      positional.push(args[i]);
    }
  }

  if (positional.length < 1) {
    console.error('Usage: node dateFormat.js <date:YYYY-MM-DD> [--ref YYYY-MM-DD] [--long]');
    process.exit(1);
  }

  const dt = parse(positional[0]);
  if (!dt) {
    console.error(`Invalid date "${positional[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  let ref;
  if (refArg !== null) {
    ref = parse(refArg);
    if (!ref) {
      console.error(`Invalid reference date "${refArg}". Expected YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  try {
    const abs = formatAbsolute(dt[0], dt[1], dt[2], { long });
    const rel = ref
      ? formatRelative(dt[0], dt[1], dt[2], ref[0], ref[1], ref[2])
      : formatRelative(dt[0], dt[1], dt[2]);
    console.log(`Absolute: ${abs}`);
    console.log(`Relative: ${rel}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
