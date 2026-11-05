## Walkthrough & Validation
All tasks mounts into the shell's tasks view with the view controls, the add bar, the task list, and empty states.
It renders again after every store change and asks for persistent storage after the first task.
`views.css` fills the main column, pins the compact add bar, and puts search and Sort on the first wide row.
The review follow-ups, rows, add bar, and controls moved to T0035, T0036, and T0037; this is stage 4 of the split.

### Red Phase
The stage 4 tests ran against stage 3, where no screen fills the tasks view. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.

Command: `npx vitest run tests/unit/tokens.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × are imported by style.css in order: fonts, tokens, controls, app components, app chrome, app shell, then views 11ms
     × scale no token by a bare number in views.css, using size tokens instead 2ms
[... 3 lines omitted ...]
 FAIL  tests/unit/tokens.test.js > stylesheets outside tokens.css > are imported by style.css in order: fonts, tokens, controls, app components, app chrome, app shell, then views
AssertionError: expected [ 'fonts.css', 'tokens.css', …(4) ] to deeply equal [ 'fonts.css', 'tokens.css', …(5) ]
[... 23 lines omitted ...]
 FAIL  tests/unit/tokens.test.js > stylesheets outside tokens.css > scale no token by a bare number in views.css, using size tokens instead
AssertionError: expected [ 'missing' ] to deeply equal []
[... 20 lines omitted ...]
 Test Files  1 failed (1)
      Tests  2 failed | 114 passed (116)
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8824 npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/shell.spec.js --timeout 10000` (exit code 1)

```text
[... 3 lines omitted ...]
  x   2 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 390 px (LOC-1) (5.9s)
  x   3 [chromium] › tests\e2e\all-tasks.spec.js:144:1 › the status menu changes a status by mouse and by keyboard (TSK-4) (6.1s)
  x   1 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 1440 px (LOC-1) (6.2s)
  x   4 [chromium] › tests\e2e\all-tasks.spec.js:114:1 › Enter adds a task, keeps focus in the add bar, and asks for persistent storage once (TSK-1, TEC-5) (10.1s)
  x   5 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 390 px (TV-1 to TV-12) (5.6s)
  x   6 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 1440 px (TV-1 to TV-12) (5.7s)
  x   7 [chromium] › tests\e2e\all-tasks.spec.js:248:1 › Delete moves a task to the recycle bin and Undo brings it back, also with Ctrl+Z (TSK-11) (5.6s)
[... 10 lines omitted ...]
  x   8 [chromium] › tests\e2e\all-tasks.spec.js:268:1 › a row opens the task editor route, and the selected row is marked (5.6s)
[... 1 lines omitted ...]
  x  14 [chromium] › tests\e2e\shell.spec.js:94:1 › every route renders its title and its view, and the sidebar follows the lists (5.7s)
[... 311 lines omitted ...]
  9 failed
[... 9 lines omitted ...]
  11 passed (22.5s)
```

### Green Phase
Stage 4 is the working tree, with VERSION 2026-11-04.6 and regenerated hashes. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.
One test changed during green: the first-launch check now expects the hidden empty state, not a removed one.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


[... 1 lines omitted ...]


 Test Files  22 passed (22)
      Tests  517 passed (517)
   Start at  18:43:05
   Duration  4.54s (environment 59%, tests 19%, import 12%, transform 8%, worker 2%)

    Isolate  22 workers spawned · ~813ms startup each (spawn + environment, per file)
             at least ~1.74s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 40 precached files match VERSION 2026-11-04.6.
```

Command: `E2E_PORT=8824 npm run test:e2e` (exit code 0)

```text
[... 7 lines omitted ...]
  ok  2 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 390 px (LOC-1) (1.5s)
  ok  1 [chromium] › tests\e2e\all-tasks.spec.js:144:1 › the status menu changes a status by mouse and by keyboard (TSK-4) (1.7s)
  ok  4 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 1440 px (LOC-1) (1.6s)
  ok  3 [chromium] › tests\e2e\all-tasks.spec.js:114:1 › Enter adds a task, keeps focus in the add bar, and asks for persistent storage once (TSK-1, TEC-5) (2.1s)
  ok  8 [chromium] › tests\e2e\all-tasks.spec.js:268:1 › a row opens the task editor route, and the selected row is marked (1.3s)
  ok  7 [chromium] › tests\e2e\all-tasks.spec.js:248:1 › Delete moves a task to the recycle bin and Undo brings it back, also with Ctrl+Z (TSK-11) (1.8s)
[... 1 lines omitted ...]
  ok  6 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 1440 px (TV-1 to TV-12) (3.3s)
[... 2 lines omitted ...]
  ok  5 [chromium] › tests\e2e\all-tasks.spec.js:181:3 › filters, search, and sort change the rows at 390 px (TV-1 to TV-12) (4.6s)
[... 63 lines omitted ...]
  ok 75 [chromium] › tests\e2e\shell.spec.js:94:1 › every route renders its title and its view, and the sidebar follows the lists (1.3s)
[... 7 lines omitted ...]
  81 passed (44.1s)
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

### Review Rework
Round 1 found two focus losses: Clear all in an empty result hid itself, and a store change closed an open row menu.
Clear all now moves focus to search; the list passes focus to the add bar once its last row leaves.
The open-menu fix lives in T0036's `task-list.js`; the end-to-end check below covers both on the screen.
Stage 4 now carries VERSION 2026-11-04.9.

The new tests ran in the working tree before the fix: the menu e2e test, the Clear all unit and e2e tests.

Command: `npx vitest run tests/unit/task-list.test.js tests/unit/all-tasks.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × moves focus to search when Clear all in an empty result hides itself 54ms
[... 2 lines omitted ...]
     × keeps an open status menu open, on the same item, when rows render again 16ms
     × keeps an open More menu open when rows render again 7ms
     × closes the menu and passes focus on when its row leaves 6ms
     × moves focus to the fallback control when the last row leaves 10ms
[... 3 lines omitted ...]
 FAIL  tests/unit/all-tasks.test.js > mountAllTasks > moves focus to search when Clear all in an empty result hides itself
AssertionError: expected <button …(2)></button> to be <input …(5)></input> // Object.is equality
[... 28 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > keeps an open status menu open, on the same item, when rows render again
AssertionError: expected true to be false // Object.is equality
[... 17 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > keeps an open More menu open when rows render again
AssertionError: expected true to be false // Object.is equality
[... 17 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > closes the menu and passes focus on when its row leaves
[... 11 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > moves focus to the fallback control when the last row leaves
AssertionError: expected <body><div …(1)>…(3)</div>
[... 288 lines omitted ...]
 Test Files  2 failed (2)
      Tests  5 failed | 8 passed (13)
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8807 npx playwright test tests/e2e/all-tasks.spec.js -g "store change while|Clear all in an empty"` (exit code 1)

```text
[... 3 lines omitted ...]
  x  1 [chromium] › tests\e2e\all-tasks.spec.js:280:1 › a store change while the status menu is open keeps the menu open and focused (7.0s)
  x  2 [chromium] › tests\e2e\all-tasks.spec.js:304:1 › Clear all in an empty result focuses search, and deleting the last shown row focuses the add bar (7.0s)
[... 18 lines omitted ...]
    > 296 |   await expect(menu).toBeVisible();
[... 34 lines omitted ...]
    > 311 |   await expect(search).toBeFocused();
[... 16 lines omitted ...]
  2 failed
[... 2 lines omitted ...]
```

The fixed stage 4, the working tree, in a fresh tree with regenerated hashes:

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


[... 1 lines omitted ...]


 Test Files  23 passed (23)
      Tests  522 passed (522)
   Start at  19:03:16
   Duration  4.22s (environment 61%, tests 19%, import 12%, transform 7%, worker 1%)

    Isolate  23 workers spawned · ~777ms startup each (spawn + environment, per file)
             at least ~1.78s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 40 precached files match VERSION 2026-11-04.9.
```

Command: `E2E_PORT=8824 npm run test:e2e` (exit code 0)

```text
[... 13 lines omitted ...]
  ok  9 [chromium] › tests\e2e\all-tasks.spec.js:280:1 › a store change while the status menu is open keeps the menu open and focused (1.1s)
[... 2 lines omitted ...]
  ok 10 [chromium] › tests\e2e\all-tasks.spec.js:304:1 › Clear all in an empty result focuses search, and deleting the last shown row focuses the add bar (2.2s)
[... 74 lines omitted ...]
  83 passed (1.0m)
```
