## Walkthrough & Validation

Format 3 export, format 2 and format 1 conversion on import, with the tests that prove them.

### Failing tests first (before the implementation)

Command: `npx vitest run tests/unit/backup.test.js`, exit code 1.

```
 FAIL  tests/unit/backup.test.js > format 3 export > writes the goal, start time, and cache fields of ADR-0006, with fail for cancel, and no target-count
 FAIL  tests/unit/backup.test.js > format 3 export > exports a legacy complete event stored by an earlier import as a checked log
 FAIL  tests/unit/backup.test.js > format 3 export > round-trips a goal task with entries into an empty store, in overwrite and merge mode
 FAIL  tests/unit/backup.test.js > format 3 export > rejects complete and uncomplete events, and the rule fields of format 2, in a format 3 file
 FAIL  tests/unit/backup.test.js > format 2 conversion on import > turns target-count into a checks goal, cancel into fail, complete into logs, and uncomplete into undos
 FAIL  tests/unit/backup.test.js > format 2 conversion on import > converts the edit events, and reports the uncomplete that the old fold ignored
      Tests  6 failed | 117 passed (123)
```

The format 1 status-event tests failed with `expected [ 'create', 'complete', 'uncomplete' ] to deeply equal [ 'create', 'log', 'undo-log' ]` before `withLogs` existed.
The undo-log skip test and the format 3 sample tests were written beside their code, so no failing run exists for them.

### Backup unit tests after the implementation

Command: `npx vitest run tests/unit/backup.test.js`, exit code 0.

```
 Test Files  1 passed (1)
      Tests  128 passed (128)
```

### Whole unit suite

Command: `npx vitest run`, exit code 0.

```
 Test Files  73 passed (73)
      Tests  2112 passed (2112)
```

### Lint

Command: `npx eslint .`, exit code 0, no output.

### Backup end-to-end test

Command: `npx playwright test tests/e2e/backup.spec.js`, exit code 0.

```
  ok  9 [chromium] › tests\e2e\backup.spec.js:255:1 › a target-3 task with two completions shows 2/3 after an export and an import into an empty app (2.2s)
  ok 10 [chromium] › tests\e2e\backup.spec.js:297:1 › a goal task with entries exports in format 3 and imports into an empty app with its goal, window, and entries (2.1s)
  ok 12 [chromium] › tests\e2e\backup.spec.js:393:1 › connected, a merge import queues its changes, shows Syncing then Synced, and drains the queue (2.1s)
  12 passed (12.4s)
```

The bin-settings and all-tasks end-to-end specs also pass: `47 passed (41.7s)`.

### Service worker precache check

Command: `node scripts/check-sw-version.mjs --update`, then `npm run check:sw`, exit code 0.

```
OK: 166 precached files match VERSION 2026-11-28.13.
```

### Not run

The contract tests skip without `TODOS_SERVER_DIR`: `Contract tests skipped: set TODOS_SERVER_DIR to a todos checkout`.

### Review round 1 rework: bounded missing checks

Before the fix, the new test `adds no missing checks for a huge valid progress` (progress 999,999,998,000-scale gap) did not finish: `npx vitest run tests/unit/backup.test.js -t "huge valid progress"` ran past 60 s and was stopped with `processes kill --yes --force`.

After the fix (`MISSING_CHECKS_MAX` = 32,767), exit code 0:

```
 Test Files  1 passed (1)
      Tests  129 passed (129)
```

Whole unit suite (`npx vitest run`), exit code 0:

```
 Test Files  73 passed (73)
      Tests  2113 passed (2113)
```

`npx playwright test tests/e2e/backup.spec.js`: `12 passed (12.8s)`. `npx eslint src tests`: no output. `npm run check:sw`: `OK: 166 precached files match VERSION 2026-11-28.14.`

### Review round 2 rework: option C, reported cap and linear rebuild

The loop manager chose option C. Before the change, the new test `rebuilds a gap of exactly 32767 checks, and reports the first gap above it` did not finish: the per-check refold made the rebuild quadratic, and the run was stopped with `processes kill --yes --force`.

After the change, `npx vitest run tests/unit/backup.test.js`, exit code 0:

```
      Tests  130 passed (130)
```

`npx vitest run`, exit code 0:

```
 Test Files  73 passed (73)
      Tests  2114 passed (2114)
```

`npx playwright test tests/e2e/backup.spec.js`: `12 passed (12.6s)`. `npx eslint .`: no output. `npm run check:sw`: `OK: 166 precached files match VERSION 2026-11-28.15.`
