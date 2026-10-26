'use strict';

/**
 * Quarter calculator for Gregorian (AD) dates.
 *
 * Given a date, reports which calendar quarter it falls in (Q1–Q4), the
 * quarter's start and end dates, how many days are in that quarter, and how
 * far into the quarter the date is.
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

/** First month of each quarter (index 0 -> Q1). */
const QUARTER_START_MONTH = [1, 4, 7, 10];

/**
 * Compute the calendar quarter for a date.
 *
 * @param {number} y Year (AD)
 * @param {number} m Month (1-12)
 * @param {number} d Day (1-31)
 * @returns {{quarter:number, label:string, start:{year:number,month:number,day:number},
 *            end:{year:number,month:number,day:number}, daysInQuarter:number,
 *            dayIntoQuarter:number}}
 *   `quarter` is 1-4; `label` is "Q1".."Q4"; `start`/`end` bound the quarter;
 *   `daysInQuarter` is its length (90 or 91 — Q1 is 91 in a leap year);
 *   `dayIntoQuarter` is the 1-based position of the date within the quarter.
 * @throws {RangeError} if the date is invalid.
 */
function getQuarter(y, m, d) {
  if (!isValidDate(y, m, d)) {
    throw new RangeError(`Invalid date: ${y}-${m}-${d}`);
  }

  const q = Math.floor((m - 1) / 3); // 0..3
  const quarter = q + 1;             // 1..4
  const startMonth = QUARTER_START_MONTH[q];
  const endMonth = startMonth + 2;

  const start = { year: y, month: startMonth, day: 1 };
  const end = { year: y, month: endMonth, day: daysInMonth(y, endMonth) };

  let daysInQuarter = 0;
  for (let mm = startMonth; mm <= endMonth; mm++) {
    daysInQuarter += daysInMonth(y, mm);
  }

  let dayIntoQuarter = d;
  for (let mm = startMonth; mm < m; mm++) {
    dayIntoQuarter += daysInMonth(y, mm);
  }

  return {
    quarter,
    label: `Q${quarter}`,
    start,
    end,
    daysInQuarter,
    dayIntoQuarter,
  };
}

module.exports = { getQuarter, isValidDate, daysInMonth, isLeapYear };

// CLI entry point: node quarter.js YYYY-MM-DD
if (require.main === module) {
  const args = process.argv.slice(2);
  const parse = (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };

  if (args.length < 1) {
    console.error('Usage: node quarter.js <date:YYYY-MM-DD>');
    process.exit(1);
  }

  const dt = parse(args[0]);
  if (!dt) {
    console.error(`Invalid date "${args[0]}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  try {
    const r = getQuarter(dt[0], dt[1], dt[2]);
    const fmt = (x) => `${x.year}-${String(x.month).padStart(2, '0')}-${String(x.day).padStart(2, '0')}`;
    console.log(`${fmt({ year: dt[0], month: dt[1], day: dt[2] })} is in ${r.label}`);
    console.log(`  Span:       ${fmt(r.start)} to ${fmt(r.end)}`);
    console.log(`  Days in ${r.label}: ${r.daysInQuarter}`);
    console.log(`  Day into ${r.label}: ${r.dayIntoQuarter}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
