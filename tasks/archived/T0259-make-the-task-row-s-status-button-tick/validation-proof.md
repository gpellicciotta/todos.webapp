## Walkthrough & Validation

### Key Changes
- `tickEvent` returns `complete` or null; it never returns `uncomplete` or `reopen`.
- A row whose tick is null marks its status button `aria-disabled="true"`, names it by status, and sets the inert tooltip.
- Every posted tick shows an Undo toast: "Task marked completed." on a status change, "Ticked, 4 of 3 done." on a count change.
- Status menu picks keep the toast only when the change hides the row; the menu stays until T0260.

### Red Phase: Unit Tests Before Implementation
Command: `npx vitest run tests/unit/task-list.test.js tests/unit/recurrence-review.test.js tests/unit/settings.test.js` (filtered with `Select-String`). Exit code: 1.

```text
 ❯ tests/unit/recurrence-review.test.js (10 tests | 1 failed) 155ms
     × offers only Reopen on the row of a series that ended completed, whose click is inert 13ms
 ❯ tests/unit/settings.test.js (51 tests | 1 failed) 1056ms
     × lists the nine shortcuts under a Keyboard shortcuts heading, in order, with each key in a kbd 14ms
 ❯ tests/unit/task-list.test.js (75 tests | 10 failed) 4761ms
     × completes open tasks at target 1, and leaves completed and cancelled ones alone (TSK-4) 41ms
     × completes every status but cancelled above target 1, also past the target (TSK-4) 4ms
     × leaves a closed recurring series alone, completed or cancelled 2ms
     × shows done and target counts on a row whose target is above 1, and none at target 1 21ms
     × ticks a target-3 task towards its target, and past it once completed 15ms
       × ticks: completes open tasks on one click, and never changes completed or cancelled ones at target 1 15ms
       × marks an inert status button aria-disabled, focusable, and named by its status alone 35ms
       × posts nothing on x in a row whose click is inert 34ms
       × shows the Undo toast after every tick, also when the row stays shown and without a filter 1015ms
       × names the counts in the toast of a tick that changes only the count, and Undo posts uncomplete 1015ms
[... 14 lines omitted ...]
AssertionError: expected 'uncomplete' to be 'complete' // Object.is equality
[... 9 lines omitted ...]
AssertionError: expected 'Untick Gym, 4 of 3 done' to be 'Tick Gym, 4 of 3 done' // Object.is equality
[... 10 lines omitted ...]
AssertionError: expected 'Mark Water the plants to do' to be 'Water the plants, completed' // Object.is equality
[... 3 lines omitted ...]
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 4 times
[... 3 lines omitted ...]
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
[... 3 lines omitted ...]
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
 Test Files  3 failed (3)
      Tests  12 failed | 124 passed (136)
```

### Red Phase: E2E Tests Before Implementation
Command: `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js -g "4 of 3|inert to a click" --reporter=line`. Exit code: 1.
The old click unticked 3 of 3 to 2 of 3, and the completed row had no `aria-disabled` name.

```text
  2) [chromium] › tests\e2e\all-tasks.spec.js:204:1 › a click ticks a completed target-3 task to 4 of 3, and one Undo sets it back to 3 of 3 (TSK-4) 

    Error: expect(locator).toHaveText(expected) failed

    Locator:  locator('.task-row').filter({ hasText: 'Gym' }).locator('.task-row__count')
    Expected: "4/3 done"
    Received: "2/3 done"
    Timeout:  5000ms
[... 20 lines omitted ...]
  2 failed
    [chromium] › tests\e2e\all-tasks.spec.js:204:1 › a click ticks a completed target-3 task to 4 of 3, and one Undo sets it back to 3 of 3 (TSK-4) 
    [chromium] › tests\e2e\list.spec.js:300:3 › List screen › a completed target-1 row is inert to a click and to x, and keeps its status menu (TSK-4)
```

```text
    Error: expect(locator).toHaveAttribute(expected) failed
    Locator: locator('.list-view .task-row').filter({ hasText: 'Water the plants' }).getByRole('button', { 
name: 'Water the plants, completed' })
    Expected: "true"
    Error: element(s) not found
  1 failed
```

### Green Phase: Unit Suite
Command: `npx vitest run` (filtered with `Select-String`). Exit code: 0.

```text
 Test Files  65 passed (65)
      Tests  1733 passed (1733)
   Duration  42.86s (environment 48%, tests 40%, import 7%, transform 3%, worker 2%, setup 1%)
```

One earlier run of the same command failed only the timing test `query.test.js > filters and sorts 5000 tasks in under 50 ms`.
It took 82.0 ms under load; this task does not touch query.js, and the rerun above passed.

### Green Phase: All Tasks and List E2E Specs
Command: `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js --reporter=list` (TSK-4 lines and summary). Exit code: 0.

```text
  ok  3 [chromium] › tests\e2e\all-tasks.spec.js:171:1 › one click completes a task, x ticks the focused row, and Undo or Ctrl+Z sets it back (TSK-4) (5.4s)
  ok  5 [chromium] › tests\e2e\all-tasks.spec.js:204:1 › a click ticks a completed target-3 task to 4 of 3, and one Undo sets it back to 3 of 3 (TSK-4) (3.4s)
  ok  6 [chromium] › tests\e2e\all-tasks.spec.js:239:1 › the status menu posts start and cancel by right-click and by keyboard (TSK-4) (3.5s)
  ok 42 [chromium] › tests\e2e\list.spec.js:300:3 › List screen › a completed target-1 row is inert to a click and to x, and keeps its status menu (TSK-4) (2.4s)
  ok 41 [chromium] › tests\e2e\list.spec.js:262:3 › List screen › one click completes a task with an Undo toast, and the status menu cancels a task (TSK-4) (3.7s)
  47 passed (1.3m)
```

### Full E2E Suite
Command: `npx playwright test --reporter=line`. Exit code: 1.

```text
  2 failed
    [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes 
    [chromium] › tests\e2e\list.spec.js:123:5 › List screen › Alt+Enter in the add field adds tasks in a row at the end of the list, keeping the focus (TSK-1, LV-5) 
  251 passed (5.3m)
```

- `behaviors-dialog.spec.js:77` fails on main too: its `[aria-live="polite"]` locator also matches the gallery's editor count region.
  T0258 added that region; this task does not touch the gallery. Follow-up: T0276.
- `list.spec.js:123` passed on its rerun, and in the green run above; it is timing-sensitive, not affected here.

Rerun command: `npx playwright test tests/e2e/behaviors-dialog.spec.js:77 tests/e2e/list.spec.js:123 --reporter=line`. Exit code: 1.

```text
    Error: expect(locator).toHaveText(expected) failed
    Expected: "Task moved to the recycle bin."
    Error: strict mode violation: locator('[aria-live="polite"]') resolved to 2 elements:
    > 87 |     await expect(page.locator('[aria-live="polite"]')).toHaveText('Task moved to the recycle bin.');
  1 failed
  2 passed (8.2s)
```

### Related Specs, Lint, and Service Worker Check
Command: `npx playwright test tests/e2e/sharing.spec.js tests/e2e/gallery-app.spec.js tests/e2e/behaviors.spec.js tests/e2e/recurrence.spec.js --reporter=line`. Exit code: 0.

```text
  33 passed (1.2m)
```

Command: `npx eslint` on the changed JavaScript files, then `npm run check:sw` after bumping VERSION. Exit codes: 0 and 0.

```text
eslint exit: 0
OK: 131 precached files match VERSION 2026-11-17.26.
```

### Visual Verification
A scratchpad Playwright spec seeded targets 1 and 3 in each status at 1280 × 800, asserted HTTP 200, and allowed no console, page, or network errors.
It then clicked the completed target 3 row.
- Before: the click unticked 3 of 3 to 2 of 3, and no toast showed.
- After: the click ticks to 4 of 3, and the toast reads "Ticked, 4 of 3 done." with Undo.

- Rows, light: [before](before-rows-light.png), [after](after-rows-light.png).
- Rows, dark: [before](before-rows-dark.png), [after](after-rows-dark.png).
- Toast, light: [before](before-toast-light.png), [after](after-toast-light.png).
- Toast, dark: [before](before-toast-dark.png), [after](after-toast-dark.png).
