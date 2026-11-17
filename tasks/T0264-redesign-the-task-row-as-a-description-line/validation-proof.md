## Walkthrough & Validation

### Key Changes
- `task-list.js` builds a 2-line description, a meta line with the due or repeat item and the lists, and a count badge in the status button.
- `formatDue` keeps the relative text for overdue tasks, such as "Yesterday 10:00", and flags them overdue.
- `app-components.css` clamps the description, styles the meta line, the orange overdue text, the list pills from 48rem, and the badge tints.
- The sprite gains a `repeat` icon; the gallery specimens, ui-design.md, the style guide, and CHANGELOG.md follow.

### Red Phase (before implementation)
Command: `npx vitest run tests/unit/task-list.test.js tests/unit/all-tasks.test.js` (exit code 1), output filtered to failures:

```text
 ❯ tests/unit/all-tasks.test.js (33 tests | 1 failed) 859ms
     × updates the due chip on the minute tick and keeps the row and an open More menu (OVD-2) 53ms
 ❯ tests/unit/task-list.test.js (73 tests | 10 failed) 3367ms
     × shows a relative time, and marks open tasks past their due time overdue while keeping the time (OVD-2) 37ms
     × renders one row per task: the description line, then a meta line with the due text and the lists 35ms
     × marks only overdue due text for the danger color, and renders no Overdue chip (OVD-2) 101ms
     × renders no note count, no people icon, and no chips on any row 13ms
     × shows done and target counts as a badge on the status icon above target 1, and none at target 1 7ms
     × ticks a target-3 task towards its target, and past it once completed 10ms
     × renders the row again when only its count changes 6ms
     × updates only the due chips on the clock tick, keeping rows, an open menu, and focus 5ms
       × shows a connected recurring task past its period end as ready 0/3, with a repeat icon and interval instead of 
a due time 16ms
       × turns a row ready 0/3 on the minute tick once its period ends 5ms
[... 40 lines omitted ...]
 Test Files  2 failed (2)
      Tests  11 failed | 95 passed (106)
```

Command: `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/gallery-app.spec.js --reporter=line` (exit code 1), filtered:

```text
  1) [chromium] › tests\e2e\all-tasks.spec.js:240:3 › a row shows a description of at most 2 lines and a meta line 
with orange overdue text at 360 px (OVD-2) 
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: 2
    Received: 1
  2) [chromium] › tests\e2e\all-tasks.spec.js:240:3 › a row shows a description of at most 2 lines and a meta line 
with orange overdue text at 1440 px (OVD-2) 
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: 2
    Received: 1
  3) [chromium] › tests\e2e\all-tasks.spec.js:204:1 › a click ticks a completed target-3 task to 4 of 3, and one Undo 
sets it back to 3 of 3 (TSK-4) 
    Error: expect(locator).toHaveText(expected) failed
    Expected: "3/3"
    Received: "3/3 done"
           - unexpected value "3/3 done"
[... 47 lines omitted ...]
  12 failed
  46 passed (1.4m)
```

### Green Phase (after the final change)
Command: `npm test` (exit code 0):

```text
> todos-webapp@0.5.1-pre test
> vitest run

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0264-redesign-the-task-row-as-a-description-line

 Test Files  65 passed (65)
      Tests  1736 passed (1736)
   Start at  15:53:05
   Duration  45.30s (environment 47%, tests 40%, import 6%, transform 4%, worker 2%, setup 1%)
```

Command: `npx eslint .` (exit code 0): no output.

Command: `node scripts/check-sw-version.mjs` (exit code 0):

```text
OK: 131 precached files match VERSION 2026-11-17.29.
```

Command: `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/gallery-app.spec.js tests/e2e/long-list.spec.js --reporter=line` (exit code 0):

```text
[60/62] [chromium] › tests\e2e\long-list.spec.js:103:3 › rows taller than 48 px in a long list (TEC-16) › reaches the end of the list with its last row at the bottom
[61/62] [chromium] › tests\e2e\long-list.spec.js:115:3 › rows taller than 48 px in a long list (TEC-16) › keeps the rows in view where they are while rows above them are measured
[62/62] [chromium] › tests\e2e\long-list.spec.js:131:1 › the first rows paint before the start-up maintenance ends (TEC-16)
  62 passed (1.4m)
```

Command: `npx playwright test --reporter=line` (exit code 1), the full suite, filtered:

```text
  1) [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its 
Undo, and undoes 
    Error: expect(locator).toHaveText(expected) failed
    Locator: locator('[aria-live="polite"]')
    Error: strict mode violation: locator('[aria-live="polite"]') resolved to 2 elements:
        1) <span aria-live="polite" class="task-editor__count">1 of 3</span> aka getByText('1 of 3', { exact: true })
        2) <div role="status" aria-live="polite" aria-atomic="true" class="visually-hidden" data-live-region="polite">Task moved to the recycle bin.</div>
  1 failed
  260 passed (4.5m)
```

The one failure predates this task: T0258 (67d85b7) added the `aria-live` editor count to the gallery.
This task touches neither element; follow-up task T0280 fixes the test.

### Visual Verification
Captured with a Playwright harness against HEAD's `src` (before) and the worktree's `src` (after).
Every capture returned HTTP 200 with no console errors, page errors, or failed requests.
- Before: [360 light](screenshots/before-360-light.png), [360 dark](screenshots/before-360-dark.png), [768 light](screenshots/before-768-light.png), [768 dark](screenshots/before-768-dark.png), [1440 light](screenshots/before-1440-light.png), [1440 dark](screenshots/before-1440-dark.png).
- After: [360 light](screenshots/after-360-light.png), [360 dark](screenshots/after-360-dark.png), [768 light](screenshots/after-768-light.png), [768 dark](screenshots/after-768-dark.png), [1440 light](screenshots/after-1440-light.png), [1440 dark](screenshots/after-1440-dark.png).
- The after captures show the overdue row in orange, the recurring row with its repeat icon, and the 4/3 and 2/3 badges.
