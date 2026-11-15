## Walkthrough & Validation

### Summary of Key Changes
- `src/js/core/periods.js` computes day, week, and month periods in IANA zones with `Intl`; all 31 shared vectors pass.
- `occurrences.js` plans roll-overs, fresh periods, grace targets, and the display rule; rule edits follow the server.
- The store rolls over in local mode before events and rule edits; the minute timer rolls over in local mode too.
- While connected, an event past the period end joins the locally computed period and is queued without `occurrence`.
- Grace completion names the cached or previous occurrence; local mode refolds that closed occurrence.
- The task editor has Repeat, Every, Ends on, Ends after, and Timezone, plus a History section.
- Recurring rows show a repeat chip, never Overdue, and a stale row shows To do with count 0.
- The contract server is a read-only clone of todos.server `9564bec`, built in the ignored `node_modules/.cache/t0235/`.

### Red phase: new unit tests before the implementation
Command: `npx vitest run tests/unit/periods.test.js tests/unit/occurrences.test.js tests/unit/store-recurrence.test.js tests/unit/task-list.test.js tests/unit/task-editor.test.js`
Exit code: 1

```text
⎯⎯⎯⎯⎯⎯ Failed Tests 33 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  5 failed (5)
      Tests  33 failed | 123 passed (156)
     14  FAIL  tests/unit/occurrences.test.js
      1  FAIL  tests/unit/periods.test.js [ tests/unit/periods.test.js ]
     10  FAIL  tests/unit/store-recurrence.test.js
      6  FAIL  tests/unit/task-editor.test.js
      3  FAIL  tests/unit/task-list.test.js
Error: Cannot find module '../../src/js/core/periods.js' imported from .../tests/unit/periods.test.js
```

One new test passed before the implementation: the connected grace post on the cached current occurrence.
The store already queued the event with that occurrence number; the test now pins that behavior.

### Red phase: new e2e test before the implementation
Command: `npx playwright test tests/e2e/task-editor.spec.js -g "weekly task"`
Exit code: 1

```text
    Error: locator.selectOption: Test timeout of 30000ms exceeded.
      - waiting for locator('[data-editor-slot] .editor-panel').getByLabel('Repeat')
  1 failed
    [chromium] › tests\e2e\task-editor.spec.js:291:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over
```

### Unit suite
Command: `npm test`
Exit code: 0

```text
 Test Files  59 passed (59)
      Tests  1388 passed (1388)
```

### Lint and service worker check
Command: `npm run lint && npm run check:sw`
Exit code: 0

```text
> eslint .
OK: 128 precached files match VERSION 2026-11-15.12.
```

### E2E suite
Command: `npm run test:e2e`
Exit code: 0

```text
  ✓  209 [chromium] › tests\e2e\task-editor.spec.js:292:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over (2.8s)
  209 passed (2.2m)
```

### Contract suite against a local server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0235/todos-server npm run test:contract`
Exit code: 0

```text
> todos-webapp@0.4.1-pre test:contract
> vitest run --config vitest.contract.config.js

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

The new contract test makes a task weekly, ticks it, and checks the server's period equals the local one.

### Screenshots
- Editor: [before](before-editor.png), [after](after-editor.png).
- Recurring row: [before](before-recurring-row.png), [after](after-recurring-row.png).
- History view: [after](after-history.png); it had no before state.

## Review Round 1 Rework

### Changes
- All tasks and the list view apply the display rule before filters, sorts, and groups; their minute tick re-renders.
- `countLists` counts a stale recurring task as open; the sidebar counts refresh every minute.
- The task editor takes an injectable `now` clock for the display rule.
- A closed recurring current occurrence takes only `reopen`, completed or cancelled; rows and the editor offer only Reopen.
- The grace precondition holds against the past occurrence before its period ended, as the server checks it.
- Recurring folds apply `roll-over` and `end-recurrence` last, as the server's `TaskOccurrence.fold` does.
- Queue undo has modes: a grace event leaves the current occurrence alone; a new occurrence restores the whole one before.
- [local-store.md](../../docs/specs/local-store.md) links its file references and describes the corrected behavior.

### Red phase: regression tests against the reviewed source
The fixes came first in this round; the tests then ran against `src/` checked out from the reviewed commit `4408ee1`.
Command: `git checkout 4408ee1 -- src && npx vitest run tests/unit/recurrence-review.test.js; git checkout HEAD -- src`
Exit code: 1

```text
     × counts a recurring task past its period end as open, whatever status it closed the period with 11ms
     × tells when a task passed its period end since the last render 1ms
     × shows a recurring task completed last period under the default open filter once its period ended 26ms
     × takes only reopen on a closed recurring occurrence, completed or cancelled 2ms
     × offers only Reopen on the row of a series that ended completed 2ms
     × refuses other events on an ended series in the store, and reopens it once its end rules allow 28ms
     × folds the event that ends a recurring period last, also at the same time 2ms
     × leaves the current occurrence alone when a grace event for the previous one is undone 7ms
     × gives back the whole occurrence before an event that opened the next period 5ms
     × gives back the closed occurrence when a recurring reopen is undone 4ms
AssertionError: expected 'uncomplete' to be 'reopen' // Object.is equality
AssertionError: promise resolved "{ event: { …(7) }, task: { …(8) } }" instead of rejecting
AssertionError: expected { occurrence: 2, …(6) } to deeply equal { occurrence: 1, …(6) }
TypeError: becameStale is not a function
      Tests  10 failed (10)
```

### Unit suite
Command: `npm test`
Exit code: 0

```text
 Test Files  60 passed (60)
      Tests  1398 passed (1398)
```

### Lint, service worker check, and Markdown lint
Command: `npm run lint && npm run check:sw && lint-markdown check docs/specs/local-store.md`
Exit code: 0

```text
> eslint .
OK: 128 precached files match VERSION 2026-11-15.13.
All 1 markdown files passed linting.
```

The other changed Markdown files report only issues outside this task's hunks.
Those are failing external link checks (HTTP 429 and 404) and `ui-design.md` lines 360, 406, and 615.

### E2E suite
Command: `npm run test:e2e`
Exit code: 0

```text
  ✓  209 [chromium] › tests\e2e\task-editor.spec.js:292:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over (5.2s)

  209 passed (2.7m)
```

### Contract suite against a local server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0235/todos-server npm run test:contract`
Exit code: 0

```text
 Test Files  1 passed (1)
      Tests  10 passed (10)
```
