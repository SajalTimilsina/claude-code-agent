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

`weekday.js` determines the day of the week (Sunday–Saturday) for any AD
(Gregorian) date using the Sakamoto algorithm — a pure integer-arithmetic
formula with no lookup tables. It also provides helpers for comparing
weekdays and finding the next occurrence of a given weekday.

### Usage (CLI)

```bash
node weekday.js <date:YYYY-MM-DD> [--next WEEKDAY_INDEX]
```

`WEEKDAY_INDEX` is 0=Sunday through 6=Saturday.

Examples:

```bash
$ node weekday.js 2024-07-04
2024-07-04 is a Thursday (index 4)

$ node weekday.js 2024-01-01 --next 2
2024-01-01 is a Monday (index 1)
Next Tuesday: in 1 day
```

### Usage (module)

```js
const { getWeekday, isSameWeekday, daysUntilNextWeekday } = require('./weekday.js');

getWeekday(2024, 7, 4);
// -> { index: 4, name: 'Thursday' }

isSameWeekday(2024, 1, 1, 2024, 1, 8);   // both Mondays -> true
daysUntilNextWeekday(2024, 1, 1, 2);     // next Tuesday from Monday -> 1
```

`getWeekday(y, m, d)` throws a `RangeError` for invalid dates.
Helpers exported for reuse/testing: `isValidDate`, `daysInMonth`, `isLeapYear`.
