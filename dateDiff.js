'use strict';

/**
 * Date difference calculator for Gregorian (AD) dates.
 *
 * Given two calendar dates, returns the number of days between them as a
 * signed value (positive when `to` is after `from`, negative when before),
 * plus the whole-year / whole-month / remaining-day breakdown of that span.
 *
 * The calculation uses calendar arithmetic on UTC components only, so it is
 * independent of the machine's local time zone. Reuses the date-validation
 * helpers from ./age.js rather than duplicating them.
 */

const { isValidDate } = require('./age.js');

/**
 * Compute the difference between two dates.
 *
 * @param {number} fy From year   (AD)
 * @param {number} fm From month  (1-12)
 * @param {number} fd From day    (1-31)
 * @param {number} ty To year     (AD)
 * @param {number} tm To month    (1-12)
 * @param {number} td To day      (1-31)
 * @returns {{days:number, years:number, months:number, daysLeft:number, formatted:string}}
 *   - `days`: total signed day count (`to - from`); 0 when the dates are equal.
 *   - `years`/`months`/`daysLeft`: whole-calendar breakdown of the span in the
 *     direction of travel (always non-negative).
 *   - `formatted`: e.g. "5 days", "1 year, 2 months, 3 days".
 * @throws {RangeError} if either date is invalid.
 */
function dateDiff(fy, fm, fd, ty, tm, td) {
  if (!isValidDate(fy, fm, fd)) {
    throw new RangeError(`Invalid start date: ${fy}-${fm}-${fd}`);
  }
  if (!isValidDate(ty, tm, td)) {
    throw new RangeError(`Invalid end date: ${ty}-${tm}-${td}`);
  }

  const days = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000
  );

  // Walk the span forward from the earlier date to get a non-negative
  // years/months/days breakdown, then attach the overall sign to `days`.
  let [sy, sm, sd] = [fy, fm, fd];
  let [ey, em, ed] = [ty, tm, td];
  if (days < 0) {
    [sy, sm, sd] = [ty, tm, td];
    [ey, em, ed] = [fy, fm, fd];
  }

  let years = ey - sy;
  let months = em - sm;
  let daysLeft = ed - sd;

  // Borrow until the breakdown is non-negative. A single pass is not enough
  // when the target day overflows two months at once (e.g. Jan 31 -> Mar 1:
  // borrowing one month lands on "Feb 31", which still overflows).
  while (daysLeft < 0) {
    months -= 1;
    daysLeft += daysInMonth(sy + years, sm + months); // borrow from previous month
  }
  while (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    days,
    years,
    months,
    daysLeft,
    formatted: formatSpan(years, months, daysLeft),
  };
}

/** Human-readable form of a whole-calendar span; "0 days" when empty. */
function formatSpan(years, months, days) {
  const parts = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} day${days === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

// Local copy — age.js does not export daysInMonth via a stable API surface we
// want to depend on beyond isValidDate; keeping this private avoids coupling.
function daysInMonth(y, m) {
  switch (m) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : 28;
    default:
      return 0;
  }
}

module.exports = { dateDiff, formatSpan };

// CLI entry point: node dateDiff.js YYYY-MM-DD YYYY-MM-DD
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 2) {
    console.error('Usage: node dateDiff.js <from:YYYY-MM-DD> <to:YYYY-MM-DD>');
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
    console.log(`Difference: ${diff.formatted}`);
    console.log(`Total days: ${diff.days}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
