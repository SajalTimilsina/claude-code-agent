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
