'use strict';

/**
 * Date string parser for Gregorian (AD) dates.
 *
 * Converts human-readable date strings into structured { year, month, day }
 * objects. Supports several common formats:
 *
 *   ISO 8601:      "2024-07-04"
 *   US numeric:    "07/04/2024"
 *   EU numeric:    "04.07.2024"
 *   Long form:     "July 4, 2024"
 *   Short month:   "Jul 4, 2024"
 *   Day-first:     "4 July 2024"
 *
 * All validation uses UTC components only, so results are independent of
 * the machine's local time zone.
 */

const MIN_YEAR = 1;
const MAX_YEAR = 9999;

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Build a lookup map: lowercase name -> month number (1-12)
const MONTH_LOOKUP = {};
MONTHS_LONG.forEach((name, i) => { MONTH_LOOKUP[name.toLowerCase()] = i + 1; });
MONTHS_SHORT.forEach((name, i) => { MONTH_LOOKUP[name.toLowerCase()] = i + 1; });

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
 * Parse a date string into a structured object.
 *
 * Supported formats (tried in order):
 *   1. "YYYY-MM-DD"       — ISO 8601
 *   2. "MM/DD/YYYY"       — US numeric with slashes
 *   3. "DD.MM.YYYY"       — European numeric with dots
 *   4. "Month D, YYYY"    — long month name, e.g. "July 4, 2024"
 *   5. "Mon D, YYYY"      — short month name, e.g. "Jul 4, 2024"
 *   6. "D Month YYYY"     — day first, long month, e.g. "4 July 2024"
 *   7. "D Mon YYYY"       — day first, short month, e.g. "4 Jul 2024"
 *
 * @param {string} str The date string to parse.
 * @returns {{year:number, month:number, day:number, format:string}}
 *          format is one of: 'iso', 'us-numeric', 'eu-numeric',
 *          'long-month', 'short-month', 'day-first-long', 'day-first-short'
 * @throws {RangeError} if the string does not match any supported format
 *         or the resulting date is invalid.
 */
function parseDate(str) {
  if (typeof str !== 'string') {
    throw new RangeError(`Expected a string, got ${typeof str}`);
  }

  const s = str.trim();
  if (s.length === 0) {
    throw new RangeError('Empty date string');
  }

  // 1. ISO: YYYY-MM-DD
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    return buildResult(Number(m[1]), Number(m[2]), Number(m[3]), 'iso');
  }

  // 2. US numeric: MM/DD/YYYY
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    return buildResult(Number(m[3]), Number(m[1]), Number(m[2]), 'us-numeric');
  }

  // 3. EU numeric: DD.MM.YYYY
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m) {
    return buildResult(Number(m[3]), Number(m[2]), Number(m[1]), 'eu-numeric');
  }

  // 4. Short month: "Jul 4, 2024" or "Jul 4 2024" (exactly 3 letters)
  m = /^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m) {
    const mon = MONTH_LOOKUP[m[1].toLowerCase()];
    if (mon) {
      return buildResult(Number(m[3]), mon, Number(m[2]), 'short-month');
    }
  }

  // 5. Long month: "July 4, 2024" or "July 4 2024" (4+ letters)
  m = /^([A-Za-z]{4,})\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m) {
    const mon = MONTH_LOOKUP[m[1].toLowerCase()];
    if (mon) {
      return buildResult(Number(m[3]), mon, Number(m[2]), 'long-month');
    }
  }

  // 6. Day-first short: "4 Jul 2024" (exactly 3 letters)
  m = /^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/.exec(s);
  if (m) {
    const mon = MONTH_LOOKUP[m[2].toLowerCase()];
    if (mon) {
      return buildResult(Number(m[3]), mon, Number(m[1]), 'day-first-short');
    }
  }

  // 7. Day-first long: "4 July 2024" (4+ letters)
  m = /^(\d{1,2})\s+([A-Za-z]{4,}),?\s+(\d{4})$/.exec(s);
  if (m) {
    const mon = MONTH_LOOKUP[m[2].toLowerCase()];
    if (mon) {
      return buildResult(Number(m[3]), mon, Number(m[1]), 'day-first-long');
    }
  }

  throw new RangeError(`Unrecognized date format: "${str}"`);
}

/**
 * Validate that a parsed result is a real calendar date and return it.
 */
function buildResult(y, mo, d, format) {
  if (!isValidDate(y, mo, d)) {
    throw new RangeError(`Invalid date: ${y}-${mo}-${d} (format: ${format})`);
  }
  return { year: y, month: mo, day: d, format };
}

/**
 * Check whether a string can be parsed as a valid date without throwing.
 *
 * @param {string} str The date string to test.
 * @returns {boolean} true if parseDate would succeed.
 */
function isValidDateString(str) {
  try {
    parseDate(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a { year, month, day } object as an ISO 8601 string "YYYY-MM-DD".
 *
 * @param {{year:number, month:number, day:number}} date
 * @returns {string}
 * @throws {RangeError} if the date is invalid.
 */
function formatDate(date) {
  if (!date || typeof date !== 'object') {
    throw new RangeError('Expected a date object with year, month, day');
  }
  const { year, month, day } = date;
  if (!isValidDate(year, month, day)) {
    throw new RangeError(`Invalid date: ${year}-${month}-${day}`);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
}

module.exports = {
  parseDate,
  isValidDateString,
  formatDate,
  isValidDate,
  daysInMonth,
  isLeapYear,
};

// CLI entry point: node dateParser.js <date-string>
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node dateParser.js <date-string>');
    console.error('Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD.MM.YYYY,');
    console.error('  "Month D, YYYY", "Mon D, YYYY", "D Month YYYY", "D Mon YYYY"');
    process.exit(1);
  }

  // Join all args in case the user quoted a multi-word date
  const input = args.join(' ');

  try {
    const result = parseDate(input);
    console.log(`Parsed:  ${result.year}-${String(result.month).padStart(2, '0')}-${String(result.day).padStart(2, '0')}`);
    console.log(`Format:  ${result.format}`);
    console.log(`ISO:     ${formatDate(result)}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
