# Validation proof for T0306

## Failing tests before the implementation

Command: `npx vitest run tests/unit/store-tasks.test.js tests/unit/task-editor.test.js`
Exit code: 1

```
 FAIL  tests/unit/store-tasks.test.js > goal fields > takes the year unit as a recurrence rule
ValidationError: Not a valid recurrence-unit: year; it is day, week, or month.
 FAIL  tests/unit/store-tasks.test.js > goal fields > takes a decimal target from 0 for amount and reading goals, and only a whole number for checks and time
ValidationError: Not a valid target-count: 79.875; it is a whole number of at least 1.
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > focuses the Status tab once the task loaded, and has no Save button
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > status actions and lifecycle rules > goal > offers Check, At least, and At most, opens on Check, and hides measure, target, and unit then
 Test Files  2 failed (2)
      Tests  42 failed | 109 passed (151)
```

## Passing runs after the implementation and the review rework

Command: `npx vitest run`
Exit code: 0

```
 Test Files  72 passed (72)
      Tests  2010 passed (2010)
   Duration  22.82s (tests 51%, environment 37%, import 8%, transform 2%, worker 1%, setup 1%)
```

Command: `npx eslint .`
Exit code: 0

```
(no output)
```

Command: `npx playwright test tests/e2e/task-editor.spec.js tests/e2e/behaviors.spec.js --reporter=list` (lines filtered to results; no lines omitted)
Exit code: 0

```
ok  3 [chromium] › tests\e2e\behaviors.spec.js:93:3 › menu behavior › the menu opens anchored below its trigger inside a 390 px viewport (2.0s)
ok  4 [chromium] › tests\e2e\behaviors.spec.js:83:3 › menu behavior › an outside click closes the menu and returns focus to the trigger (2.0s)
ok  2 [chromium] › tests\e2e\behaviors.spec.js:29:3 › menu behavior › keyboard alone opens, moves through, selects in, and closes the working menu (3.1s)
ok  5 [chromium] › tests\e2e\behaviors.spec.js:157:3 › popover behavior › an outside click closes the popover (1.5s)
ok  1 [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it (3.7s)
ok  9 [chromium] › tests\e2e\task-editor.spec.js:182:3 › the editor opens from a row on Status with focus on its tab, and Escape returns to the row at 1440 px (2.1s)
ok  8 [chromium] › tests\e2e\task-editor.spec.js:182:3 › the editor opens from a row on Status with focus on its tab, and Escape returns to the row at 390 px (3.6s)
ok  7 [chromium] › tests\e2e\task-editor.spec.js:98:3 › the editor splits into Status, Notes, Configuration, and History tabs, edits a field on each, and deletes from Configuration at 1440 px (4.2s)
ok 10 [chromium] › tests\e2e\task-editor.spec.js:205:1 › a click on the row of the open task closes the editor, and another row switches it (1.6s)
ok  6 [chromium] › tests\e2e\task-editor.spec.js:98:3 › the editor splits into Status, Notes, Configuration, and History tabs, edits a field on each, and deletes from Configuration at 390 px (7.0s)
ok 12 [chromium] › tests\e2e\task-editor.spec.js:267:1 › ticks a target-3 task to 3/3 and edits its deadline through the lifecycle rules in local mode (4.0s)
ok 11 [chromium] › tests\e2e\task-editor.spec.js:218:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (4.6s)
ok 13 [chromium] › tests\e2e\task-editor.spec.js:319:1 › the stepper steps a target-3 task to 2 and back to 1, then Ready resets it to 0, by state buttons only (5.3s)
ok 14 [chromium] › tests\e2e\task-editor.spec.js:360:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (3.8s)
ok 15 [chromium] › tests\e2e\task-editor.spec.js:388:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (3.3s)
ok 16 [chromium] › tests\e2e\task-editor.spec.js:414:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (4.4s)
ok 19 [chromium] › tests\e2e\task-editor.spec.js:526:1 › Cancel task cancels the task and Uncancel reopens it, from the Danger zone of Configuration (3.3s)
ok 18 [chromium] › tests\e2e\task-editor.spec.js:479:1 › a weekly at-most kcal goal with a start time saves as lifecycle rules and survives a reload (TSK-15, TSK-16, TSK-20) (4.9s)
ok 17 [chromium] › tests\e2e\task-editor.spec.js:448:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (5.4s)
ok 20 [chromium] › tests\e2e\task-editor.spec.js:547:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over (3.6s)
ok 21 [chromium] › tests\e2e\task-editor.spec.js:583:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global (3.2s)
21 passed (23.2s)
```

## Full e2e suite and the base commit

Command: `npx playwright test --reporter=line` on the task branch before fixing the all-tasks, list, and sharing specs
Final summary lines: `21 failed` and `278 passed (5.0m)`.

Command: the all-tasks, backup, list, sharing, and store-upgrade specs on base commit a8a3668 in a temporary worktree
Final summary lines: `6 failed` and `69 passed (1.2m)`. The failures:
all-tasks 417 (390 px and 1440 px), all-tasks 853, backup 255, list 456, store-upgrade 52.

Command: the all-tasks, list, and sharing specs on the task branch after the spec fixes
Final summary lines: `4 failed` and `59 passed (1.1m)`. The failures are the same four as on base: all-tasks 417 (two), all-tasks 853, list 456.
The backup 255 and store-upgrade 52 failures also fail on base and are not in these three files.

## Screenshots

Before: [Status light](before-status-light.png), [Status dark](before-status-dark.png), [Content light](before-content-light.png), [Content dark](before-content-dark.png)
After: [Status light](after-status-light.png), [Status dark](after-status-dark.png), [Configuration light](after-configuration-light.png), [Configuration dark](after-configuration-dark.png), [Danger zone light](after-configuration-bottom-light.png), [Danger zone dark](after-configuration-bottom-dark.png)
