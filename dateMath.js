'use strict';

/**
 * Date arithmetic for Gregorian (AD) dates.
 *
 * Adds or subtracts whole days or months from a date, finds the next
 * occurrence of a given weekday, and counts business days between two
 * dates. Month addition clamps to the last day of the target month
 * (e.g. Jan 31 + 1 month -> Feb 28/29), which is the common calendar
 * convention.
 *
 * All arithmetic is done on UTC components only, so results are
 * independent of the machine's local time zone.
 */

const MIN_YEAR = 1; // AD year range we accept
const MAX_YEAR = 9999;

const WEEKDAYS = [
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
 * The day of the week for a date, via Sakamoto's algorithm.
 * @returns {number} 0 = Sunday … 6 = Saturday
 */
function weekdayIndex(y, m, d) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

/**
 * Add (or subtract) whole days to a date.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} n Days to add (negative to go back in time)
 * @returns {{year:number, month:number, day:number}}
 * @throws {RangeError} if the date is invalid, `n` is not an integer, or
 *         the result falls outside the AD range (years 1-9999).
 */
function addDays(y, m, d, n) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  if (!Number.isInteger(n)) {
    throw new RangeError(`Invalid day delta: ${n}`);
  }
  const ms = Date.UTC(y, m - 1, d) + n * 86400000;
  const r = new Date(ms);
  const ry = r.getUTCFullYear();
  if (ry < MIN_YEAR || ry > MAX_YEAR) {
    throw new RangeError(`Result ${ry}-... is outside the supported AD range`);
  }
  return { year: ry, month: r.getUTCMonth() + 1, day: r.getUTCDate() };
}

/**
 * Add (or subtract) whole months to a date.
 *
 * The day is clamped to the last day of the target month when it does not
 * exist there (Jan 31 + 1 month -> Feb 28, or Feb 29 in a leap year).
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} n Months to add (negative to go back in time)
 * @returns {{year:number, month:number, day:number}}
 * @throws {RangeError} if the date is invalid, `n` is not an integer, or
 *         the result falls outside the AD range (years 1-9999).
 */
function addMonths(y, m, d, n) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  if (!Number.isInteger(n)) {
    throw new RangeError(`Invalid month delta: ${n}`);
  }
  const total = (y * 12 + (m - 1)) + n;
  const ry = Math.floor(total / 12);
  const rm = (total % 12) + 1;
  if (ry < MIN_YEAR || ry > MAX_YEAR) {
    throw new RangeError(`Result ${ry}-... is outside the supported AD range`);
  }
  const rd = Math.min(d, daysInMonth(ry, rm));
  return { year: ry, month: rm, day: rd };
}

/**
 * The next date strictly after the given one that falls on the requested
 * weekday. If `strict` is false and the date already has that weekday, the
 * same date is returned.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} w Target weekday, 0 = Sunday … 6 = Saturday
 * @param {{strict?:boolean}} [opts] Default true: skip the input date itself.
 * @returns {{year:number, month:number, day:number}}
 * @throws {RangeError} if the date is invalid or `w` is out of range.
 */
function nextWeekday(y, m, d, w, opts = {}) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  if (!Number.isInteger(w) || w < 0 || w > 6) {
    throw new RangeError(`Invalid weekday: ${w} (expected 0-6)`);
  }
  const strict = opts.strict !== false;
  const cur = weekdayIndex(y, m, d);
  let step = (w - cur + 7) % 7;
  if (step === 0 && strict) step = 7;
  return addDays(y, m, d, step);
}

/**
 * Count business days (Monday-Friday) in the half-open interval
 * `[from, to)` — `from` included, `to` excluded.
 *
 * @param {number} fy From year
 * @param {number} fm From month
 * @param {number} fd From day
 * @param {number} ty To year
 * @param {number} tm To month
 * @param {number} td To day
 * @returns {number} Business-day count (0 when the dates are equal or reversed)
 * @throws {RangeError} if either date is invalid.
 */
function businessDaysBetween(fy, fm, fd, ty, tm, td) {
  if (!isValidDate(fy, fm, fd)) {
    throw new RangeError(`Invalid start date: ${fy}-${fm}-${fd}`);
  }
  if (!isValidDate(ty, tm, td)) {
    throw new RangeError(`Invalid end date: ${ty}-${tm}-${td}`);
  }
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  if (to <= from) return 0;

  // Walk by weeks: each full week contributes exactly 5 business days.
  let count = 0;
  let cursor = from;
  while (cursor + 7 * 86400000 <= to) {
    count += 5;
    cursor += 7 * 86400000;
  }
  // Handle the remaining tail day-by-day.
  while (cursor < to) {
    const dow = new Date(cursor).getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
    cursor += 86400000;
  }
  return count;
}

module.exports = {
  addDays,
  addMonths,
  nextWeekday,
  businessDaysBetween,
  weekdayIndex,
  isValidDate,
  daysInMonth,
  isLeapYear,
  WEEKDAYS,
};

// CLI entry point: node dateMath.js <op> <date:YYYY-MM-DD> [args...]
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const usage = () => {
    console.error('Usage:');
    console.error('  node dateMath.js add-days   YYYY-MM-DD <n>');
    console.error('  node dateMath.js add-months YYYY-MM-DD <n>');
    console.error('  node dateMath.js next-weekday YYYY-MM-DD <weekday:0-6>');
    console.error('  node dateMath.js business-days YYYY-MM-DD YYYY-MM-DD');
    process.exit(1);
  };

  if (args.length < 3) usage();

  const op = args[0];
  const dt = parse(args[1]);
  if (!dt) {
    console.error(`Invalid date "${args[1]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  try {
    let result;
    switch (op) {
      case 'add-days': {
        const n = Number(args[2]);
        if (!Number.isInteger(n)) throw new RangeError(`Invalid day delta: ${args[2]}`);
        result = addDays(dt[0], dt[1], dt[2], n);
        break;
      }
      case 'add-months': {
        const n = Number(args[2]);
        if (!Number.isInteger(n)) throw new RangeError(`Invalid month delta: ${args[2]}`);
        result = addMonths(dt[0], dt[1], dt[2], n);
        break;
      }
      case 'next-weekday': {
        const w = Number(args[2]);
        result = nextWeekday(dt[0], dt[1], dt[2], w);
        break;
      }
      case 'business-days': {
        const to = parse(args[2]);
        if (!to) {
          console.error(`Invalid end date "${args[2]}". Expected YYYY-MM-DD.`);
          process.exit(1);
        }
        const n = businessDaysBetween(dt[0], dt[1], dt[2], to[0], to[1], to[2]);
        console.log(`Business days: ${n}`);
        process.exit(0);
      }
      default:
        usage();
    }
    const label = op === 'next-weekday' ? `Next ${WEEKDAYS[Number(args[2])]}:` : 'Result:';
    console.log(`${label} ${result.year}-${String(result.month).padStart(2, '0')}-${String(result.day).padStart(2, '0')}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
