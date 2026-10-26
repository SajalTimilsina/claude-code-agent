'use strict';

/**
 * Date-difference calculator for Gregorian (AD) dates.
 *
 * Given two dates, returns the span between them as:
 *   - total days (exact calendar difference)
 *   - a years / months / days breakdown
 *   - a human-readable summary string
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
 * Compute the difference between two dates.
 *
 * The result always describes the span from the earlier date to the later
 * date, regardless of argument order; `direction` records which argument was
 * later. When `from` precedes `to`, direction is "forward"; otherwise it is
 * "backward".
 *
 * @param {number} fy From year   (AD)
 * @param {number} fm From month  (1-12)
 * @param {number} fd From day    (1-31)
 * @param {number} ty To year
 * @param {number} tm To month
 * @param {number} td To day
 * @returns {{years:number, months:number, days:number, totalDays:number,
 *            direction:"forward"|"backward", formatted:string}}
 * @throws {RangeError} if either date is invalid.
 */
function dateDiff(fy, fm, fd, ty, tm, td) {
  if (!isValidDate(fy, fm, fd)) {
    throw new RangeError(`Invalid start date: ${fy}-${fm}-${fd}`);
  }
  if (!isValidDate(ty, tm, td)) {
    throw new RangeError(`Invalid end date: ${ty}-${tm}-${td}`);
  }

  const forward = Date.UTC(ty, tm - 1, td) >= Date.UTC(fy, fm - 1, fd);
  // Work with (earlier, later) so the breakdown is always non-negative.
  let [ey, em, ed] = forward ? [fy, fm, fd] : [ty, tm, td];
  let [ly, lm, ld] = forward ? [ty, tm, td] : [fy, fm, fd];

  let years = ly - ey;
  let months = lm - em;
  let days = ld - ed;

  if (days < 0) {
    months -= 1;
    days += daysInMonth(ly, lm - 1); // borrow from the previous month
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.round(
    (Date.UTC(ly, lm - 1, ld) - Date.UTC(ey, em - 1, ed)) / 86400000
  );

  return {
    years,
    months,
    days,
    totalDays,
    direction: forward ? 'forward' : 'backward',
    formatted: `${years} year${plural(years)}, ${months} month${plural(months)}, ${days} day${plural(days)}`,
  };
}

function plural(n) {
  return n === 1 ? '' : 's';
}

module.exports = { dateDiff, isValidDate, daysInMonth, isLeapYear };

// CLI entry point: node dateDiff.js YYYY-MM-DD YYYY-MM-DD
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 2) {
    console.error('Usage: node dateDiff.js <start:YYYY-MM-DD> <end:YYYY-MM-DD>');
    process.exit(1);
  }

  const f = parse(args[0]);
  if (!f) {
    console.error(`Invalid start date "${args[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }
  const t = parse(args[1]);
  if (!t) {
    console.error(`Invalid end date "${args[1]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  try {
    const diff = dateDiff(f[0], f[1], f[2], t[0], t[1], t[2]);
    const dir = diff.direction === 'forward' ? 'after' : 'before';
    console.log(`Difference: ${diff.formatted}`);
    console.log(`Total days: ${diff.totalDays} (${t.join('-')} is ${dir} ${f.join('-')})`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
