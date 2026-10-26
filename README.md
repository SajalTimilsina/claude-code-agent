# Claude Code Agent

A coding agent you talk to through a Slack bot.

## Exact Age Calculator

This repo also contains `age.js`, a small dependency-free JavaScript program
that takes a birthdate in the AD (Gregorian) calendar and returns the person's
**exact age** — whole years, months and days — plus the total number of days
lived. See below for usage.

### Usage (CLI)

```bash
node age.js <birthdate:YYYY-MM-DD> [reference-date:YYYY-MM-DD]
```

If the reference date is omitted, today's date is used.

Examples:

```bash
$ node age.js 1990-05-15 2024-08-20
Exact age: 34 years, 3 months, 5 days
Total days: 12561

$ node age.js 2000-02-29          # leap-day birthday, reference = today
Exact age: ...
```

### Usage (module)

```js
const { calculateAge } = require('./age.js');

// from a birthdate to an explicit reference date
calculateAge(1990, 5, 15, 2024, 8, 20);
// -> { years: 34, months: 3, days: 5, totalDays: 12561, formatted: '34 years, 3 months, 5 days' }

// from a birthdate to today
calculateAge(2000, 2, 29);
```

`calculateAge(by, bm, bd, ry?, rm?, rd?)` throws a `RangeError` for invalid
dates or when the reference date precedes the birthdate.

Helpers exported for reuse/testing: `isValidDate`, `daysInMonth`, `isLeapYear`.

### Running tests

Tests use Node's built-in test runner (no dependencies required).

```bash
npm test
# or
node --test test/
```

## Date Difference Calculator

`dateDiff.js` is a companion tool that computes the span between **any two**
AD (Gregorian) dates — not just from a birthdate. It returns the total number
of days plus a years / months / days breakdown, and works in either direction
(the result always describes the earlier-to-later span; `direction` records
which argument was later).

### Usage (CLI)

```bash
node dateDiff.js <start:YYYY-MM-DD> <end:YYYY-MM-DD>
```

Examples:

```bash
$ node dateDiff.js 1990-05-15 2024-08-20
Difference: 34 years, 3 months, 5 days
Total days: 12516 (2024-08-20 is after 1990-05-15)

$ node dateDiff.js 2024-08-20 1990-05-15
Difference: 34 years, 3 months, 5 days
Total days: 12516 (1990-05-15 is before 2024-08-20)
```

### Usage (module)

```js
const { dateDiff } = require('./dateDiff.js');

dateDiff(1990, 5, 15, 2024, 8, 20);
// -> { years: 34, months: 3, days: 5, totalDays: 12516,
//      direction: 'forward', formatted: '34 years, 3 months, 5 days' }
```

`dateDiff(fy, fm, fd, ty, tm, td)` throws a `RangeError` for invalid dates.
Helpers exported for reuse/testing: `isValidDate`, `daysInMonth`, `isLeapYear`.

## Date Formatter

`dateFormat.js` renders an AD (Gregorian) date as a human-friendly string in
two styles:

- **absolute** — fixed calendar rendering, e.g. `Jan 5, 2024` (or
  `January 5, 2024` with the long form).
- **relative** — compared to a reference date (defaults to today), e.g.
  `today`, `yesterday`, `3 days ago`, `in 2 weeks`, `5 months from now`. The
  largest sensible unit (day / week / month / year) is used.

### Usage (CLI)

```bash
node dateFormat.js <date:YYYY-MM-DD> [--ref YYYY-MM-DD] [--long]
```

Examples:

```bash
$ node dateFormat.js 2024-08-17 --ref 2024-08-20
Absolute: Aug 17, 2024
Relative: 3 days ago

$ node dateFormat.js 2024-01-05 --long
Absolute: January 5, 2024
Relative: ...   # relative to today
```

### Usage (module)

```js
const { formatAbsolute, formatRelative } = require('./dateFormat.js');

formatAbsolute(2024, 1, 5);                  // -> 'Jan 5, 2024'
formatAbsolute(2024, 1, 5, { long: true });  // -> 'January 5, 2024'
formatRelative(2024, 8, 17, 2024, 8, 20);   // -> '3 days ago'
formatRelative(2024, 8, 20);                // -> 'today' (if run on that day)
```

Both functions throw a `RangeError` for invalid dates.

## Weekday Calculator

`weekday.js` returns the day of the week on which an AD (Gregorian) date falls —
as a number (`0 = Sunday` … `6 = Saturday`), a short name (`Sun` … `Sat`) and a
long name (`Sunday` … `Saturday`). It is computed with Zeller's congruence, so
it works directly on calendar components with no time-zone or epoch arithmetic.

### Usage (CLI)

```bash
node weekday.js <date:YYYY-MM-DD>
```

Examples:

```bash
$ node weekday.js 2024-08-20
2024-8-20 was a Tuesday (Tue, index 2)

$ node weekday.js 1970-01-01
1970-1-1 was a Thursday (Thu, index 4)
```

### Usage (module)

```js
const { weekday } = require('./weekday.js');

weekday(2024, 8, 20); // -> { index: 2, short: 'Tue', long: 'Tuesday' }
```

`weekday(y, m, d)` throws a `RangeError` for invalid dates. Helpers exported for
reuse/testing: `isValidDate`, `daysInMonth`, `isLeapYear`.

## Quarter Calculator

`quarter.js` reports which calendar quarter (Q1–Q4) an AD (Gregorian) date falls
in, the quarter's start and end dates, how many days are in that quarter, and how
far into the quarter the date is. Q1 is 90 days in a common year and 91 in a leap
year; the other quarters have fixed lengths (Q2 = 91, Q3 = 92, Q4 = 92).

### Usage (CLI)

```bash
node quarter.js <date:YYYY-MM-DD>
```

Examples:

```bash
$ node quarter.js 2024-08-20
2024-08-20 is in Q3
  Span:       2024-07-01 to 2024-09-30
  Days in Q3: 92
  Day into Q3: 51

$ node quarter.js 2024-02-29
2024-02-29 is in Q1
  Span:       2024-01-01 to 2024-03-31
  Days in Q1: 91
  Day into Q1: 60
```

### Usage (module)

```js
const { getQuarter } = require('./quarter.js');

getQuarter(2024, 8, 20);
// -> { quarter: 3, label: 'Q3',
//      start: { year: 2024, month: 7, day: 1 },
//      end:   { year: 2024, month: 9, day: 30 },
//      daysInQuarter: 92, dayIntoQuarter: 51 }
```

`getQuarter(y, m, d)` throws a `RangeError` for invalid dates. Helpers exported
for reuse/testing: `isValidDate`, `daysInMonth`, `isLeapYear`.
