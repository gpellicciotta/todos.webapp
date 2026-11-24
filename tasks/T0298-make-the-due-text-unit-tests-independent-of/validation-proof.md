## Walkthrough & Validation

### Key Changes
- `task-list.test.js` gained a `clock(hours, minutes)` helper with the row's `Intl` options and the default locale.
- Five row due text expectations in `task-list.test.js` and one in `all-tasks.test.js` use it instead of a fixed "10:00".
- The `formatDue` tests keep their explicit `en-GB` locale, and the app still formats in the user's locale.

### Reproduction
Windows Node ignores `LANG`, so a temporary setup file forced `Intl.DateTimeFormat` to default to `en-US`.
A temporary `vitest.en-us.tmp.config.js` loaded it before `tests/unit/setup.js`; both files were removed afterward.

Command: `npx vitest run --config vitest.en-us.tmp.config.js` before the fix (exit 1)

```text
 FAIL  tests/unit/all-tasks.test.js > mountAllTasks > updates the due chip on the minute tick and keeps the row and its focus, with no row menu (OVD-2)
 FAIL  tests/unit/task-list.test.js > createTaskList > renders one row per task: the description line, then a meta line with the due text and the lists
 FAIL  tests/unit/task-list.test.js > createTaskList > marks only overdue due text for the danger color, and renders no Overdue chip (OVD-2)
 FAIL  tests/unit/task-list.test.js > createTaskList > updates only the due chips on the clock tick, keeping rows and focus
 Test Files  2 failed | 66 passed (68)
      Tests  4 failed | 1819 passed (1823)
```

These are the same four tests that fail in the Pages workflow runs since 2026-11-17.

### Green phase
Command: `npx vitest run --config vitest.en-us.tmp.config.js` (exit 0)

```text
 Test Files  68 passed (68)
      Tests  1823 passed (1823)
```

Command: `npx vitest run` with the machine default `en-BE` (exit 0)

```text
 Test Files  68 passed (68)
      Tests  1823 passed (1823)
```

Command: `npx eslint tests/unit/task-list.test.js tests/unit/all-tasks.test.js` (exit 0, no output)

### End-to-end suite under CI-like settings
The Pages workflow runs the e2e suite after the unit tests, so it has not run on CI since 2026-11-17.
A temporary `playwright.ci-locale.tmp.config.js` set `locale: 'en-US'` and `timezoneId: 'UTC'`, with `TZ=UTC` for Node.
A first run without `TZ=UTC` failed one task editor test, because Node and the browser used different time zones.

Command: `$env:TZ='UTC'; npx playwright test --config playwright.ci-locale.tmp.config.js` (exit 0)

```text
  283 passed (3.7m)
```
