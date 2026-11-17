## Walkthrough & Validation

### Red phase: new unit tests before the implementation
Command: `npx vitest run tests/unit/task-editor.test.js` (exit code 1)

```text
 ❯ tests/unit/task-editor.test.js (59 tests | 10 failed) 3481ms
       × shows four state buttons, the current one pressed and each named by its status, and no event actions (TSK-4) 
       × posts the events of eventsTowardsStatus in order, and never a status through updateTask 15ms
       × disables Completed below target and In progress at or above it, above target 1, with their tooltips 90ms
       × shows the stepper above target 1 outside Ready, posting complete and uncomplete 16ms
       × enables only Ready on a closed recurring series, which posts reopen 99ms
       × passes the focus of a control that disables or hides to the pressed state button 83ms
     × shows a viewer the state buttons and the stepper, every one disabled 15ms
     × hides Complete for previous period on a one-off task 21ms
     × completes the previous occurrence within 24 hours after its period ended, naming its day 19ms
     × names the cached occurrence past its period end before the roll-over, and hides once the grace period ends 11ms
      Tests  10 failed | 49 passed (59)
```

Failure reasons, from the same run filtered to error lines (exit code 1):

```text
AssertionError: expected <button …(4)>…(2)</button> to be null
TypeError: Cannot read properties of undefined (reading 'click')
AssertionError: expected [] to deeply equal [ 'ready', 'in-progress', 'cancelled' ]
TypeError: Cannot read properties of null (reading 'hidden')
AssertionError: expected [] to deeply equal [ 'ready' ]
TypeError: Cannot read properties of null (reading 'querySelector')
AssertionError: expected [] to have a length of 6 but got +0
TypeError: Cannot read properties of null (reading 'hidden')
TypeError: Cannot read properties of null (reading 'hidden')
TypeError: Cannot read properties of null (reading 'textContent')
```

The old tick button still existed and the new controls did not, so every new test failed for the intended reason.

### Green phase: unit suite
Command: `npm test` (exit code 0)

```text
 Test Files  65 passed (65)
      Tests  1726 passed (1726)
   Start at  13:49:23
   Duration  31.98s (environment 47%, tests 40%, import 7%, transform 3%, worker 2%, setup 1%)
```

### Task editor end-to-end spec
Command: `npx playwright test tests/e2e/task-editor.spec.js` with `E2E_PORT=8771` (exit code 0)

```text
  ok  4 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (3.0s)
  ok  2 [chromium] › tests\e2e\task-editor.spec.js:87:1 › a click on the row of the open task closes the editor, and another row switches it (4.1s)
  ok  1 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (4.1s)
  ok  3 [chromium] › tests\e2e\task-editor.spec.js:100:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (4.9s)
  ok  5 [chromium] › tests\e2e\task-editor.spec.js:144:1 › ticks a target-3 task to 3/3 and edits its deadline through the lifecycle rules in local mode (5.2s)
  ok  6 [chromium] › tests\e2e\task-editor.spec.js:195:1 › the stepper steps a target-3 task to 2 and back to 1, then Ready resets it to 0, by state buttons only (4.4s)
  ok  7 [chromium] › tests\e2e\task-editor.spec.js:237:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (4.6s)
  ok 10 [chromium] › tests\e2e\task-editor.spec.js:320:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (4.5s)
  ok  9 [chromium] › tests\e2e\task-editor.spec.js:288:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (5.7s)
  ok  8 [chromium] › tests\e2e\task-editor.spec.js:264:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (9.4s)
  ok 11 [chromium] › tests\e2e\task-editor.spec.js:347:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over (5.5s)
  ok 12 [chromium] › tests\e2e\task-editor.spec.js:381:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global (5.0s)

  12 passed (20.6s)
```

### Gallery specs, after the gallery markup change
Command: `npx playwright test tests/e2e/gallery-app.spec.js tests/e2e/gallery-controls.spec.js tests/e2e/gallery-chrome.spec.js` with `E2E_PORT=8772` (exit code 0)

```text
[... 48 passing test lines omitted ...]
  ok 51 [chromium] › tests\e2e\gallery-controls.spec.js:218:1 › removable chips use .chip__remove: chip corners, a raised hover ground in light mode, and a quiet disabled state (2.8s)
  ok 52 [chromium] › tests\e2e\gallery-controls.spec.js:238:1 › the field hint and counter are direct children on one row, the counter at the end (2.2s)
  ok 37 [chromium] › tests\e2e\gallery-chrome.spec.js:277:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px (31.6s)
  ok 46 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (19.7s)

  52 passed (1.5m)
```

### Lint and service worker version
Command: `npx eslint .` (exit code 0): no output.

Command: `npm run check:sw` (exit code 0), after bumping VERSION and running `node scripts/check-sw-version.mjs --update`:

```text
> node scripts/check-sw-version.mjs

OK: 131 precached files match VERSION 2026-11-17.25.
```

### Visual verification
A throwaway Playwright harness under the ignored `work/visual/` folder seeded one task per status at targets 1 and 3.
Its webServer served `src/` for after, and `git archive HEAD src` for before.
It failed on console errors, page errors, and HTTP responses of 400 or more; both runs passed (exit code 0):

```text
  ok 1 [chromium] › work\visual\status.visual.js:11:3 › status section, light (2.7s)
  ok 2 [chromium] › work\visual\status.visual.js:11:3 › status section, dark (2.3s)

  2 passed (7.0s)
```

- Before, light: [before-status-light.png](before-status-light.png); before, dark: [before-status-dark.png](before-status-dark.png).
- After, light: [after-status-light.png](after-status-light.png); after, dark: [after-status-dark.png](after-status-dark.png).
- Before shows the reported bug: "Tick, 2 of 3" carries the green completed icon.
- After shows the pressed state button, the gated Completed and In progress buttons, and the stepper outside Ready.
