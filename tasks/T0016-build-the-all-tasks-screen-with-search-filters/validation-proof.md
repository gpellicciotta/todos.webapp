## Walkthrough & Validation
All tasks fills the shell's tasks view with search, filter chips, Sort, the add bar, rows, and empty states.
The shared rows, status menu, More menu, and add bar live in their own modules for the list view.
The follow-ups from earlier reviews landed with tests: store, toast, shell, theme color, and row styles.

### Red Phase
New unit tests before the implementation; the view modules did not exist yet.

Command: `npx vitest run tests/unit/view-controls.test.js tests/unit/task-list.test.js tests/unit/add-bar.test.js tests/unit/store-db.test.js tests/unit/toast.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × keeps a committed write and the other subscribers when one subscriber throws 15ms
[... 5 lines omitted ...]
     × runs only Undo actions on Ctrl+Z, never another action such as Reload 9ms
     × ignores Ctrl+Z while a modal dialog is open 2ms
[... 3 lines omitted ...]
 FAIL  tests/unit/add-bar.test.js [ tests/unit/add-bar.test.js ]
Error: Failed to resolve import "../../src/js/views/add-bar.js" from "tests/unit/add-bar.test.js". Does the file exist?
[... 18 lines omitted ...]
 FAIL  tests/unit/task-list.test.js [ tests/unit/task-list.test.js ]
Error: Failed to resolve import "../../src/js/views/task-list.js" from "tests/unit/task-list.test.js". Does the file exist?
[... 18 lines omitted ...]
 FAIL  tests/unit/view-controls.test.js [ tests/unit/view-controls.test.js ]
Error: Failed to resolve import "../../src/js/views/view-controls.js" from "tests/unit/view-controls.test.js". Does the file exist?
[... 21 lines omitted ...]
 FAIL  tests/unit/store-db.test.js > store change notification coverage > keeps a committed write and the other subscribers when one subscriber throws
Error: subscriber failed
[... 14 lines omitted ...]
 FAIL  tests/unit/toast.test.js > createToaster > runs only Undo actions on Ctrl+Z, never another action such as Reload
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
[... 20 lines omitted ...]
 FAIL  tests/unit/toast.test.js > createToaster > ignores Ctrl+Z while a modal dialog is open
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
[... 21 lines omitted ...]
 Test Files  5 failed (5)
      Tests  3 failed | 20 passed (23)
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8807 npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/shell.spec.js --timeout 10000` (exit code 1)

```text
[... 3 lines omitted ...]
  x   2 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 1440 px (LOC-1) (6.2s)
  x   1 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 390 px (LOC-1) (6.4s)
  x   4 [chromium] › tests\e2e\all-tasks.spec.js:144:1 › the status menu changes a status by mouse and by keyboard (TSK-4) (6.4s)
  x   3 [chromium] › tests\e2e\all-tasks.spec.js:114:1 › Enter adds a task, keeps focus in the add bar, and asks for persistent storage once (TSK-1, TEC-5) (10.1s)
  x   5 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 390 px (TV-1 to TV-12) (5.7s)
  x   6 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 1440 px (TV-1 to TV-12) (5.8s)
  x   7 [chromium] › tests\e2e\all-tasks.spec.js:248:1 › Delete moves a task to the recycle bin and Undo brings it back, also with Ctrl+Z (TSK-11) (5.6s)
[... 5 lines omitted ...]
  x   8 [chromium] › tests\e2e\all-tasks.spec.js:268:1 › a row opens the task editor route, and the selected row is marked (5.6s)
[... 2 lines omitted ...]
  x  12 [chromium] › tests\e2e\shell.spec.js:71:1 › navigation marks the current route, and back and forward move between routes (5.5s)
  x  14 [chromium] › tests\e2e\shell.spec.js:94:1 › every route renders its title and its view, and the sidebar follows the lists (5.7s)
  x  17 [chromium] › tests\e2e\shell.spec.js:180:1 › the theme follows the system by default and a stored preference pins it (5.5s)
  x  19 [chromium] › tests\e2e\shell.spec.js:196:1 › a newer app version in another tab shows a lasting banner with Reload (5.4s)
  x  20 [chromium] › tests\e2e\shell.spec.js:220:1 › a start-up failure shows an error banner instead of a broken page (5.3s)
[... 447 lines omitted ...]
  13 failed
[... 13 lines omitted ...]
  7 passed (29.5s)
```

The notify-on-every-write test passed at once: it pins existing behavior the T0032 review asked to cover.
The other 19 passing unit tests are the existing toast and store tests in the same files.

The style follow-ups got their own failing checks before the CSS changes.

Command: `npx vitest run tests/unit/tokens.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × are imported by style.css in order: fonts, tokens, controls, app components, app chrome, app shell, then views 11ms
     × scale no token by a bare number in app-components.css, using size tokens instead 2ms
     × scale no token by a bare number in views.css, using size tokens instead 1ms
[... 74 lines omitted ...]
      Tests  3 failed | 113 passed (116)
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8807 npx playwright test tests/e2e/gallery-app.spec.js -g "read-only row|only open rows"` (exit code 1)

```text
[... 3 lines omitted ...]
  x  1 [chromium] › tests\e2e\gallery-app.spec.js:309:1 › the task list pattern shows only open rows under its Status: open filter (1.1s)
  x  2 [chromium] › tests\e2e\gallery-app.spec.js:286:1 › a read-only row keeps its disabled status button flat on hover, and a selected row shows press feedback (1.2s)
[... 6 lines omitted ...]
    Expected: "rgba(0, 0, 0, 0)"
    Received: "rgba(226, 226, 232, 0.91)"
[... 51 lines omitted ...]
  2 failed
[... 2 lines omitted ...]
```

### Green Phase
The completion check, plus the service worker version check from T0023, after the final change.
One test changed during green: the first-launch check now expects the hidden empty state, not a removed one.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  22 passed (22)
      Tests  517 passed (517)
   Start at  18:34:55
   Duration  3.90s (environment 63%, tests 20%, import 12%, transform 2%, worker 2%)

    Isolate  22 workers spawned · ~729ms startup each (spawn + environment, per file)
             at least ~1.56s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `E2E_PORT=8807 npm run test:e2e` (exit code 0)

```text
[... 7 lines omitted ...]
  ok  3 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 1440 px (LOC-1) (1.2s)
  ok  4 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 390 px (LOC-1) (1.4s)
  ok  2 [chromium] › tests\e2e\all-tasks.spec.js:144:1 › the status menu changes a status by mouse and by keyboard (TSK-4) (1.6s)
  ok  1 [chromium] › tests\e2e\all-tasks.spec.js:114:1 › Enter adds a task, keeps focus in the add bar, and asks for persistent storage once (TSK-1, TEC-5) (1.9s)
  ok  7 [chromium] › tests\e2e\all-tasks.spec.js:248:1 › Delete moves a task to the recycle bin and Undo brings it back, also with Ctrl+Z (TSK-11) (1.4s)
  ok  8 [chromium] › tests\e2e\all-tasks.spec.js:268:1 › a row opens the task editor route, and the selected row is marked (1.5s)
[... 1 lines omitted ...]
  ok  5 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 390 px (TV-1 to TV-12) (3.5s)
[... 1 lines omitted ...]
  ok  6 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 1440 px (TV-1 to TV-12) (3.8s)
[... 21 lines omitted ...]
  ok 34 [chromium] › tests\e2e\gallery-app.spec.js:286:1 › a read-only row keeps its disabled status button flat on hover, and a selected row shows press feedback (1.5s)
  ok 35 [chromium] › tests\e2e\gallery-app.spec.js:309:1 › the task list pattern shows only open rows under its Status: open filter (1.0s)
[... 39 lines omitted ...]
  ok 74 [chromium] › tests\e2e\shell.spec.js:71:1 › navigation marks the current route, and back and forward move between routes (981ms)
[... 4 lines omitted ...]
  ok 80 [chromium] › tests\e2e\shell.spec.js:196:1 › a newer app version in another tab shows a lasting banner with Reload (714ms)
[... 1 lines omitted ...]
  ok 81 [chromium] › tests\e2e\shell.spec.js:220:1 › a start-up failure shows an error banner instead of a broken page (594ms)
[... 2 lines omitted ...]
  81 passed (46.6s)
```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 40 precached files match VERSION 2026-11-04.3.
```

### Visual Check
Captured with a throwaway Playwright script and an in-process server; it reported HTTP 200 and no console errors.
After screenshots seed seven tasks across all statuses, three lists, notes, and due times.

| View                 | Before                                                         | After                                                                |
| :------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------- |
| 390 light            | [before](screenshots/all-tasks-390-light-before.png)           | [after](screenshots/all-tasks-390-light-after.png)                   |
| 390 dark             | [before](screenshots/all-tasks-390-dark-before.png)            | [after](screenshots/all-tasks-390-dark-after.png)                    |
| 1440 light           | [before](screenshots/all-tasks-1440-light-before.png)          | [after](screenshots/all-tasks-1440-light-after.png)                  |
| 1440 dark            | [before](screenshots/all-tasks-1440-dark-before.png)           | [after](screenshots/all-tasks-1440-dark-after.png)                   |
| First launch, 390    | [before](screenshots/all-tasks-390-light-before.png)           | [after](screenshots/all-tasks-390-dark-first-launch-after.png)       |
| First launch, 1440   | [before](screenshots/all-tasks-1440-light-before.png)          | [after](screenshots/all-tasks-1440-light-first-launch-after.png)     |
| Filters panel, 390   | none                                                           | [after](screenshots/all-tasks-390-light-filter-after.png)            |
| Status filter, 1440  | none                                                           | [after](screenshots/all-tasks-1440-light-filter-after.png)           |
| Status menu, 390     | none                                                           | [after](screenshots/all-tasks-390-light-status-menu-after.png)       |

- The first pass wrapped Clear all and Sort onto a stray second row at 1440 px.
  The wide layout now puts search and Sort first, then the chips; ui-design.md records it.
- The first pass showed "Sort : Due time" with a gap before the colon; the label is now one text run.
- The compact Filters panel ran past the screen bottom; it now caps its height and scrolls.
