'use strict';

/**
 * Exact-age calculator for Gregorian (AD) dates.
 *
 * Given a birthdate and an optional reference date, returns the person's
 * exact age as whole years, months and days, plus a human-readable string.
 *
 * The calculation uses calendar arithmetic on UTC components only, so it is
 * independent of the machine's local time zone.
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
 * Compute the exact age between two dates.
 *
 * @param {number} by Birth year   (AD)
 * @param {number} bm Birth month  (1-12)
 * @param {number} bd Birth day    (1-31)
 * @param {number} [ry] Reference year   (defaults to today)
 * @param {number} [rm] Reference month  (defaults to today)
 * @param {number} [rd] Reference day    (defaults to today)
 * @returns {{years:number, months:number, days:number, totalDays:number, formatted:string}}
 * @throws {RangeError} if either date is invalid or the reference date precedes the birthdate.
 */
function calculateAge(by, bm, bd, ry, rm, rd) {
  if (!isValidDate(by, bm, bd)) {
    throw new RangeError(`Invalid birthdate: ${by}-${bm}-${bd}`);
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
  if (Date.UTC(ry, rm - 1, rd) < Date.UTC(by, bm - 1, bd)) {
    throw new RangeError('Reference date must be on or after the birthdate');
  }

  let years = ry - by;
  let months = rm - bm;
  let days = rd - bd;

  if (days < 0) {
    months -= 1;
    days += daysInMonth(ry, rm - 1); // borrow from the previous month
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.round(
    (Date.UTC(ry, rm - 1, rd) - Date.UTC(by, bm - 1, bd)) / 86400000
  );

  return {
    years,
    months,
    days,
    totalDays,
    formatted: `${years} year${plural(years)}, ${months} month${plural(months)}, ${days} day${plural(days)}`,
  };
}

function plural(n) {
  return n === 1 ? '' : 's';
}

module.exports = { calculateAge, isValidDate, daysInMonth, isLeapYear };

// CLI entry point: node age.js YYYY-MM-DD [YYYY-MM-DD]
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 1) {
    console.error('Usage: node age.js <birthdate:YYYY-MM-DD> [reference-date:YYYY-MM-DD]');
    process.exit(1);
  }

  const b = parse(args[0]);
  if (!b) {
    console.error(`Invalid birthdate "${args[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  let r;
  if (args.length >= 2) {
    r = parse(args[1]);
    if (!r) {
      console.error(`Invalid reference date "${args[1]}". Expected YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  try {
    const age = calculateAge(b[0], b[1], b[2], ...(r || []));
    console.log(`Exact age: ${age.formatted}`);
    console.log(`Total days: ${age.totalDays}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
