'use strict';

/**
 * Date arithmetic for Gregorian (AD) dates.
 *
 * Adds or subtracts whole days, months, or years to/from a date, with
 * correct calendar rollover:
 *   - day addition handles variable month lengths and leap years
 *   - month/year addition clamps the day to the last valid day of the
 *     target month (e.g. Jan 31 + 1 month -> Feb 28/29)
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

/**
 * Add (or subtract) whole days to a date.
 *
 * Handles rollover across month boundaries, year boundaries, and leap years.
 * The result is always a valid calendar date within the accepted AD range.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} n Number of days to add (negative to subtract).
 * @returns {{year:number, month:number, day:number}}
 * @throws {RangeError} if the input date is invalid or the result falls
 *         outside the accepted AD year range (1–9999).
 */
function addDays(y, m, d, n) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  if (!Number.isInteger(n)) {
    throw new RangeError(`Day offset must be an integer, got ${n}`);
  }

  // Convert to a day-count since a fixed epoch, add, convert back.
  // We use a simple running sum — no Date objects, fully deterministic.
  const total = toDayCount(y, m, d) + n;
  return fromDayCount(total);
}

/**
 * Add (or subtract) whole months to a date.
 *
 * The day component is clamped to the last valid day of the target month.
 * Example: Jan 31 + 1 month -> Feb 28 (or Feb 29 in a leap year).
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} n Number of months to add (negative to subtract).
 * @returns {{year:number, month:number, day:number}}
 * @throws {RangeError} if the input date is invalid or the result falls
 *         outside the accepted AD year range (1–9999).
 */
function addMonths(y, m, d, n) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  if (!Number.isInteger(n)) {
    throw new RangeError(`Month offset must be an integer, got ${n}`);
  }

  const totalMonths = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(totalMonths / 12);
  const nm = (totalMonths % 12) + 1;

  if (ny < MIN_YEAR || ny > MAX_YEAR) {
    throw new RangeError(`Result year ${ny} is outside the accepted range ${MIN_YEAR}–${MAX_YEAR}`);
  }

  // Clamp day to the last valid day of the target month.
  const nd = Math.min(d, daysInMonth(ny, nm));
  return { year: ny, month: nm, day: nd };
}

/**
 * Add (or subtract) whole years to a date.
 *
 * The day component is clamped to the last valid day of the target month
 * (handles Feb 29 -> Feb 28 in non-leap years).
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @param {number} n Number of years to add (negative to subtract).
 * @returns {{year:number, month:number, day:number}}
 * @throws {RangeError} if the input date is invalid or the result falls
 *         outside the accepted AD year range (1–9999).
 */
function addYears(y, m, d, n) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }
  if (!Number.isInteger(n)) {
    throw new RangeError(`Year offset must be an integer, got ${n}`);
  }

  const ny = y + n;
  if (ny < MIN_YEAR || ny > MAX_YEAR) {
    throw new RangeError(`Result year ${ny} is outside the accepted range ${MIN_YEAR}–${MAX_YEAR}`);
  }

  const nd = Math.min(d, daysInMonth(ny, m));
  return { year: ny, month: m, day: nd };
}

// ---------------------------------------------------------------------------
// Internal helpers: convert between (y, m, d) and a linear day count.
// Day 0 = 0001-01-01. This avoids any dependence on Date objects.
// ---------------------------------------------------------------------------

/** Convert (y, m, d) to a linear day count where day 0 = 0001-01-01. */
function toDayCount(y, m, d) {
  // Days from year 1 through year y-1
  let days = 0;
  for (let yr = 1; yr < y; yr++) {
    days += isLeapYear(yr) ? 366 : 365;
  }
  // Days from month 1 through month m-1 of year y
  for (let mo = 1; mo < m; mo++) {
    days += daysInMonth(y, mo);
  }
  // Days within the month (day 1 = first day, so subtract 1)
  days += d - 1;
  return days;
}

/** Convert a linear day count back to (y, m, d). Day 0 = 0001-01-01. */
function fromDayCount(total) {
  if (total < 0) {
    throw new RangeError(`Result date is before year ${MIN_YEAR}`);
  }

  // Find the year by walking forward (fast enough for the AD range).
  let y = 1;
  let remaining = total;
  while (true) {
    const len = isLeapYear(y) ? 366 : 365;
    if (remaining < len) break;
    remaining -= len;
    y++;
    if (y > MAX_YEAR) {
      throw new RangeError(`Result year exceeds ${MAX_YEAR}`);
    }
  }

  // Find the month.
  let m = 1;
  while (true) {
    const dim = daysInMonth(y, m);
    if (remaining < dim) break;
    remaining -= dim;
    m++;
  }

  const d = remaining + 1;
  return { year: y, month: m, day: d };
}

module.exports = {
  addDays,
  addMonths,
  addYears,
  isValidDate,
  daysInMonth,
  isLeapYear,
};

// CLI entry point: node dateAdd.js YYYY-MM-DD <unit> <offset>
//   unit: d | m | y
//   offset: integer (positive or negative)
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 3) {
    console.error('Usage: node dateAdd.js <date:YYYY-MM-DD> <unit:d|m|y> <offset>');
    process.exit(1);
  }

  const dt = parse(args[0]);
  if (!dt) {
    console.error(`Invalid date "${args[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  const unit = args[1];
  const offset = Number(args[2]);
  if (!Number.isInteger(offset)) {
    console.error(`Invalid offset "${args[2]}". Expected an integer.`);
    process.exit(1);
  }

  try {
    let result;
    switch (unit) {
      case 'd': result = addDays(dt[0], dt[1], dt[2], offset); break;
      case 'm': result = addMonths(dt[0], dt[1], dt[2], offset); break;
      case 'y': result = addYears(dt[0], dt[1], dt[2], offset); break;
      default:
        console.error(`Invalid unit "${unit}". Expected d, m, or y.`);
        process.exit(1);
    }
    const pad = (n) => String(n).padStart(2, '0');
    console.log(`${dt.join('-')} ${offset >= 0 ? '+' : ''}${offset} ${unit} = ${result.year}-${pad(result.month)}-${pad(result.day)}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
