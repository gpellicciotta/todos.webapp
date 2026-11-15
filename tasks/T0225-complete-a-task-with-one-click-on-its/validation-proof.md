## Walkthrough & Validation

### Key Changes
- A click on the status button sets `completed` on `todo` or `in-progress`, and `todo` on `completed` or `cancelled`.
- The accessible name states the action, such as "Mark Buy paint completed"; the tooltip names the current status.
- Right-click, a 500 ms touch long press, Down, Up, Shift+F10, or the Menu key opens the full status menu.
- `x` toggles the focused row; it ignores modifier keys, text fields, and locked rows.
- A status change that hides the row under the view's filters shows "Task marked {{status}}." with Undo.
- The `x` row joins `SHORTCUTS`; the gallery status buttons carry the new labels.

The `npm run test:unit` script named in the completion check does not exist; `npm test` runs the same Vitest unit suite.

### Red Phase: Unit Tests
`npx vitest run tests/unit/task-list.test.js tests/unit/settings.test.js tests/unit/all-tasks.test.js > red-unit.log` (exit code 1; failing-test lines kept, passing-test lines dropped)
```text
 ❯ tests/unit/settings.test.js (16 tests | 2 failed) 239ms
     × lists the six shortcuts under a Keyboard shortcuts heading, in order, with each key in a kbd 14ms
     × joins alternative keys with "or", so a screen reader reads each term as text 4ms
 ❯ tests/unit/all-tasks.test.js (26 tests | 1 failed) 473ms
     × updates the due chip on the minute tick and keeps the row and an open status menu (OVD-2) 40ms
 ❯ tests/unit/task-list.test.js (55 tests | 19 failed) 4863ms
     × renders one row per task with its status, link, due chip, list chips, and note count 36ms
     × opens the status menu with the current status checked, and sets the picked status (TSK-4) 8ms
       × sets completed from todo and in-progress, and todo from completed and cancelled, on one click 35ms
       × names the action of the click and the current status, without a menu popup 5ms
       × opens the full status menu on right-click, and the menu still sets in-progress and cancelled 6ms
       × closes an open status menu on a click of its button, without changing the status 8ms
       × opens the menu with Down, Up, Shift+F10, or the Menu key, and leaves Enter to the click 10ms
       × opens the menu on a long press by touch, and the release does not change the status 6ms
       × treats a short tap or a moved touch as no long press 12ms
       × toggles the focused row with x, from any control of the row 8ms
       × shows an Undo toast when the change hides the row, and Undo sets the old status back 1020ms
       × shows the Undo toast for x and for a menu pick that hide the row too 1006ms
       × shows no toast when the row stays shown, and none without a filter 1022ms
       × judges the hiding with the change applied, so Finished today only keeps a task finished now 5ms
     × marks each status button and status menu item with its status 2ms
     × keeps an open status menu open, on the same item, when rows render again 4ms
     × closes the menu and passes focus on when its row leaves 3ms
     × updates only the due chips on the clock tick, keeping rows, an open menu, and focus 7ms
       × keeps the focused row, its neighbors, and an open menu rendered while they scroll away 76ms
[... 416 lines of failure details omitted ...]
      Tests  22 failed | 75 passed (97)
```
`grep -E "AssertionError|Error:" red-unit.log | sort | uniq -c | sort -rn | head -20` (exit code 0)
```text
      7 AssertionError: expected false to be true // Object.is equality
      2 AssertionError: expected true to be false // Object.is equality
      2 AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
      1 TypeError: Cannot read properties of undefined (reading 'status')
      1 TypeError: Cannot read properties of null (reading 'querySelectorAll')
      1 TypeError: Cannot read properties of null (reading 'dataset')
      1 AssertionError: expected 'Status of Call the plumber: In progre…' to be 'Mark Call the plumber completed' // Object.is equality
      1 AssertionError: expected 'Status of Buy paint: To do' to be 'Mark Buy paint completed' // Object.is equality
      1 AssertionError: expected [] to deeply equal [ …(4) ]
      1 AssertionError: expected [ 'n or /', …(4) ] to deeply equal [ 'n or /', …(5) ]
      1 AssertionError: expected [ [ [ 'n', '/' ], …(1) ], …(4) ] to deeply equal [ [ [ 'n', '/' ], …(1) ], …(5) ]
      1 AssertionError: expected "vi.fn()" to be called with arguments: [ 'a', { status: 'completed' } ]
      1 AssertionError: expected "vi.fn()" to be called 2 times, but got 0 times
      1 AssertionError: ArrowUp: expected false to be true // Object.is equality
```
The failures show the missing click toggle, labels, right-click menu, long press, `x`, Undo toast, and shortcut row.

### Red Phase: End-to-End Tests
`E2E_PORT=8925 npx playwright test tests/e2e/list.spec.js tests/e2e/all-tasks.spec.js tests/e2e/bin-settings.spec.js -g "TSK-4|Keyboard shortcuts|store change while the status menu"` (exit code 1)
```text
  ✓  1 [chromium] › tests\e2e\all-tasks.spec.js:416:1 › a store change while the status menu is open keeps the menu open and focused (2.5s)
  ✘  2 [chromium] › tests\e2e\all-tasks.spec.js:192:1 › the status menu changes a status by right-click and by keyboard (TSK-4) (6.5s)
  ✘  3 [chromium] › tests\e2e\bin-settings.spec.js:187:3 › About lists the keyboard shortcuts at wide width without a horizontal scroll (7.1s)
  ✘  5 [chromium] › tests\e2e\bin-settings.spec.js:187:3 › About lists the keyboard shortcuts at compact width without a horizontal scroll (5.6s)
  ✘  4 [chromium] › tests\e2e\all-tasks.spec.js:160:1 › one click completes a task, x toggles the focused row, and Undo or Ctrl+Z sets it back (TSK-4) (30.1s)
  ✘  6 [chromium] › tests\e2e\list.spec.js:200:3 › List screen › one click completes a task with an Undo toast, and the status menu cancels a task (TSK-4) (30.1s)
    Error: locator.click: Test timeout of 30000ms exceeded.
    Error: expect(locator).toBeVisible() failed
    Error: element(s) not found
    Error: expect(locator).toHaveText(expected) failed
    Error: expect(locator).toHaveText(expected) failed
    Error: locator.click: Test timeout of 30000ms exceeded.
  5 failed
  1 passed (39.5s)
```

### Green Phase: Unit Suite
`npm test` (exit code 0)
```text
 Test Files  55 passed (55)
      Tests  1196 passed (1196)
   Start at  01:56:31
   Duration  10.10s (environment 53%, tests 32%, import 9%, transform 3%, worker 1%, setup 1%)
```

### Green Phase: Affected End-to-End Specs
`E2E_PORT=8925 npx playwright test tests/e2e/list.spec.js tests/e2e/all-tasks.spec.js tests/e2e/bin-settings.spec.js tests/e2e/gallery-app.spec.js tests/e2e/sharing.spec.js` (exit code 0)
```text
  ✓  72 [chromium] › tests\e2e\sharing.spec.js:173:1 › the Shared filter of All tasks shows only the tasks of shared lists while connected (TV-7) (2.9s)
  ✓  67 [chromium] › tests\e2e\list.spec.js:303:3 › List screen › a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16) (15.6s)

  73 passed (55.2s)
```

### Green Phase: Full End-to-End Suite
`E2E_PORT=8925 npx playwright test` (exit code 0)
```text
  ✓  201 [chromium] › tests\e2e\task-editor.spec.js:157:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (2.8s)
  ✓  203 [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.5s)

  203 passed (2.0m)
```

### Lint and Wireframes
`npm run lint` (exit code 0)
```text
> todos-webapp@0.4.1-pre lint
> eslint .
```
`python -m pytest -q tests/test_draw_wireframes.py` (exit code 0)
```text
84 passed in 0.56s
```

### Visual Verification
A temporary Playwright spec under the ignored `work/visual/` folder seeded four tasks in All tasks.
It captured 390 px and 1440 px, light and dark, by mouse hover, keyboard focus, touch long press, and click.
It failed on console errors, page errors, failed requests, and HTTP 400 or higher; every run passed.
Before captures ran against the main checkout at the task base, after captures against this worktree.

`PHASE=after npx playwright test --config work/visual/playwright.visual.config.js` (exit code 0)
```text
Running 4 tests using 1 worker

  ✓  1 [chromium] › work\visual\visual.spec.js:10:5 › after light 390 (1.7s)
  ✓  2 [chromium] › work\visual\visual.spec.js:10:5 › after light 1440 (1.7s)
  ✓  3 [chromium] › work\visual\visual.spec.js:10:5 › after dark 390 (1.6s)
  ✓  4 [chromium] › work\visual\visual.spec.js:10:5 › after dark 1440 (1.7s)

  4 passed (8.0s)
```
`PHASE=before ROOT={{main-checkout}}/src npx playwright test --config work/visual/playwright.visual.config.js` (exit code 0)
```text
  ✓  3 [chromium] › work\visual\visual.spec.js:10:5 › before dark 390 (700ms)
  ✓  4 [chromium] › work\visual\visual.spec.js:10:5 › before dark 1440 (783ms)

  4 passed (4.5s)
```

Screenshots:
- Before, a click opens the menu: [light 390](screenshots/before-light-390-click-menu.png), [dark 1440](screenshots/before-dark-1440-click-menu.png).
- After, one click completes and shows Undo: [light 390](screenshots/after-light-390-undo-toast.png), [dark 1440](screenshots/after-dark-1440-undo-toast.png).
- After, a long press opens the menu: [light 390](screenshots/after-light-390-long-press-menu.png), [dark 1440](screenshots/after-dark-1440-long-press-menu.png).
- Rows, hover, and focus are unchanged: [before rows](screenshots/before-dark-390-rows.png), [after rows](screenshots/after-dark-390-rows.png), [after focus](screenshots/after-dark-390-focus.png).

### Review Round 1 Rework
VERSION in src/service-worker.js went from `2026-11-13.6` to `2026-11-15.1`.
`node scripts/check-sw-version.mjs --update` then rewrote the precache manifest.
The visual style guide's Status button entry now describes the click toggle and the menu paths.

`npm run check:sw` before the bump (exit code 1)
```text
ERROR: precached files changed but VERSION is still 2026-11-13.6:
  css/app-components.css
  js/views/all-tasks.js
  js/views/list.js
  js/views/settings.js
  js/views/task-list.js
Bump VERSION in service-worker.js, then run: node scripts/check-sw-version.mjs --update
```
`node scripts/check-sw-version.mjs --update` (exit code 0)
```text
OK: wrote 123 hashes for VERSION 2026-11-15.1 to {{worktree}}\scripts\sw-precache-hashes.json
```
`node scripts/check-sw-version.mjs` (exit code 0)
```text
OK: 123 precached files match VERSION 2026-11-15.1.
```
`node src/vendor/design/bin/check.mjs` (exit code 0)
```text
integrity: PASS
conformance: PASS
```
`npm test` (exit code 0)
```text
 Test Files  55 passed (55)
      Tests  1196 passed (1196)
   Start at  02:12:47
   Duration  12.51s (environment 54%, tests 32%, import 9%, transform 3%, worker 1%, setup 1%)
```
`npm run lint` (exit code 0)
```text
> todos-webapp@0.4.1-pre lint
> eslint .
```
`python -m pytest -q tests` (exit code 0)
```text
........................................................................ [ 92%]
............                                                             [100%]
156 passed in 123.09s (0:02:03)
```
Ruff is not installed on this machine, so the Ruff steps of `devops.py check` did not run.
The only Python change is one caption string in scripts/draw-wireframes.py.

`E2E_PORT=8925 npx playwright test` first run (exit code 1)
```text
  1) [chromium] › tests\e2e\connect.spec.js:141:1 › disconnecting deletes the token and shows Local only 

    Test timeout of 30000ms exceeded.

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByRole('dialog', { name: 'Disconnect from your account?' }).getByRole('button', { name: 'Disconnect' })
[... 21 lines omitted ...]
  1 failed
    [chromium] › tests\e2e\connect.spec.js:141:1 › disconnecting deletes the token and shows Local only
  202 passed (2.3m)
```
The connect spec does not touch task rows, and it passed in the round 0 full run.
`E2E_PORT=8925 npx playwright test tests/e2e/connect.spec.js --repeat-each 3` (exit code 0)
```text
  ✓  20 [chromium] › tests\e2e\connect.spec.js:141:1 › disconnecting deletes the token and shows Local only (1.8s)

  21 passed (18.5s)
```
`E2E_PORT=8925 npx playwright test` second run (exit code 0)
```text
  ✓  202 [chromium] › tests\e2e\task-editor.spec.js:181:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (4.2s)
  ✓  203 [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.1s)

  203 passed (2.3m)
```
