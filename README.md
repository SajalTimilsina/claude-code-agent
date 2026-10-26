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

## Ordinal Date Converter

`ordinal.js` converts between calendar dates and **ordinal (day-of-year)
dates** — a year written with the day number within it, e.g. `2024-354` for
December 19, 2024. It handles leap years (366-day years) and works in both
directions.

### Usage (CLI)

```bash
node ordinal.js <date:YYYY-MM-DD>
```

Examples:

```bash
$ node ordinal.js 2024-12-19
Day of year: 354 of 366 (13 days left in 2024)
Ordinal: 2024-354

$ node ordinal.js 2023-08-20
Day of year: 232 of 365 (134 days left in 2023)
Ordinal: 2023-232
```

### Usage (module)

```js
const { dayOfYear, formatOrdinal, fromOrdinal } = require('./ordinal.js');

dayOfYear(2024, 12, 19);      // -> 354
formatOrdinal(2024, 12, 19);  // -> '2024-354'
fromOrdinal(2024, 354);       // -> { month: 12, day: 19 }
```

All three functions throw a `RangeError` for invalid dates or day numbers.
Helpers exported for reuse/testing: `isValidDate`, `daysInMonth`,
`daysInYear`, `isLeapYear`.
