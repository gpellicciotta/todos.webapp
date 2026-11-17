# Validation proof T0245

## Walkthrough & Validation

The connect screen moved into the Settings Connection section; `#/connect` now renders Settings.

Failing run before the change (exit code 1):

```text
> npx vitest run tests/unit/settings.test.js tests/unit/router.test.js tests/unit/layout.test.js
 Test Files  2 failed | 1 passed (3)
      Tests  7 failed | 72 passed (79)
```

Unit suite after the change (exit code 0):

```text
> npx vitest run
 Test Files  60 passed (60)
      Tests  1570 passed (1570)
```

Lint and service worker check (exit code 0):

```text
> npx eslint .
> node scripts/check-sw-version.mjs
OK: 129 precached files match VERSION 2026-11-17.10.
```

Full e2e suite (exit code 0):

```text
> npx playwright test --reporter=line
  223 passed (3.6m)
```

Screenshots: [before intro](screenshots/before-intro-light-desktop.png), [after intro](screenshots/intro-light-desktop.png),
[after not invited](screenshots/not-invited-dark-desktop.png), [after expired](screenshots/expired-light-phone.png).

## Review round 1 rework (D1)

Added regression tests for the real notification sequence and expired-session returns; the sign-in phase now lasts until its promise settles.

```text
> npx vitest run
 Test Files  60 passed (60)
      Tests  1574 passed (1574)
> npx eslint .            (exit code 0, no output)
> node scripts/check-sw-version.mjs
OK: 129 precached files match VERSION 2026-11-17.11.
> npx playwright test --reporter=line
  223 passed (3.6m)
```
