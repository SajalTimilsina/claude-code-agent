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

## Date Formatter

`dateFormat.js` renders an AD (Gregorian) date as a human-friendly string in two
styles:

- **absolute** — fixed calendar rendering, e.g. `Jan 5, 2024` (or
  `January 5, 2024` with the long form).
- **relative** — compared to a reference date (defaults to today), e.g.
  `today`, `yesterday`, `3 days ago`, `in 2 weeks`, `5 months from now`.

The relative form picks the largest sensible unit (day / week / month / year)
and uses whole-unit floor division, the common convention for casual
date formatting. All arithmetic is UTC-based, so results don't depend on the
local time zone.

### Usage (CLI)

```bash
node dateFormat.js <date:YYYY-MM-DD> [--ref YYYY-MM-DD] [--long]
```

Examples:

```bash
$ node dateFormat.js 2024-08-20 --ref 2024-08-20
Absolute: Aug 20, 2024
Relative: today

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

formatAbsolute(2024, 1, 5);                 // -> 'Jan 5, 2024'
formatAbsolute(2024, 1, 5, { long: true }); // -> 'January 5, 2024'

// relative to an explicit reference date
formatRelative(2024, 8, 17, 2024, 8, 20);   // -> '3 days ago'

// relative to today
formatRelative(2024, 8, 20);                // -> 'today' (if run on that day)
```

Both functions throw a `RangeError` for invalid dates. Helpers exported for
reuse/testing: `isValidDate`, `daysInMonth`, `isLeapYear`.
