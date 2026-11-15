## Walkthrough & Validation

### Summary
- Enter adds by default; the Make Enter add switch in Settings (`todos.enter-adds`) turns it off.
- Every add keeps the focus in the add field; wide screens open the editor, compact screens do not.
- The new row is highlighted for two seconds and announced in the polite live region.
- Docs: VO-3, TSK-13, the Add Bar, Search and Add, and Settings designs, the settings wireframe, the gallery, and the style guide.

### Red phase: unit tests before the implementation
`npx vitest run tests/unit/add-bar.test.js tests/unit/preferences.test.js tests/unit/settings.test.js tests/unit/all-tasks.test.js tests/unit/list.test.js` (exit code 1)

```text
     × is on when storage is empty, throws, or holds anything but false 8ms
     × stores the choice under todos.enter-adds, so a reload reads it back 2ms
     × shows Make Enter add as a labeled switch, on by default, with a hint naming the other keys 11ms
     × stores the choice under todos.enter-adds at once, and shows a stored off 8ms
     × sits right after Appearance 3ms
     × reports a choice that could not be saved 3ms
     × lists the seven shortcuts under a Keyboard shortcuts heading, in order, with each key in a kbd 8ms
     × joins alternative keys with "or", so a screen reader reads each term as text 4ms
     × opens no editor on a compact screen, keeps the focus in the add field, and announces the new task (TSK-13) 1017ms
     × adds on Enter on a compact screen without opening the editor, and marks and announces the new row (TSK-13) 1032ms
       × names Enter, Shift+Enter, and Alt+Enter on the field and in the Add button tooltip by default 9ms
       × adds the trimmed description on Enter by default, clears the field, and keeps focus 1013ms
       × reads the stored choice on each Enter, so a change in Settings applies without a reload 1017ms
[... 235 lines omitted ...]

 Test Files  5 failed (5)
      Tests  13 failed | 98 passed (111)
   Start at  09:21:23
   Duration  3.88s (tests 57%, environment 36%, import 4%, transform 2%, setup 1%)

```

### Red phase: e2e specs before the implementation
`npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js --reporter=line` (exit code 1)

```text
[... 183 lines omitted ...]
  1) [chromium] › tests\e2e\all-tasks.spec.js:124:1 › Enter or Add adds a task, opens it beside the add bar, keeps the focus there, and asks for persistent storage once (TSK-1, TSK-13, TEC-5) 
    Error: expect(locator).toHaveCount(expected) failed
  2) [chromium] › tests\e2e\all-tasks.spec.js:544:1 › on a compact screen, Enter adds task after task, keeps the focus in the add field, and opens no editor (TSK-13) 
    Error: expect(locator).toHaveValue(expected) failed
  3) [chromium] › tests\e2e\list.spec.js:76:3 › List screen › the add field filters the list rows, and Enter puts the new task at the end of the list (VO-3, LV-5) 
    Error: expect(locator).toHaveValue(expected) failed
  4) [chromium] › tests\e2e\list.spec.js:94:3 › List screen › on a compact screen, Enter adds five tasks in a row at the end of the list without opening the editor (TSK-13, LV-5) 
    Error: expect(locator).toHaveValue(expected) failed
  4 failed
  36 passed (57.0s)
```

### Green phase: full e2e suite
`npx playwright test --reporter=line` (exit code 0)

```text

Running 206 tests using 4 workers

[... 205 lines omitted ...]
[206/206] [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6)
  206 passed (2.3m)
```

A first full run failed 3 tests: two About shortcut tests in bin-settings.spec.js expected the old six shortcuts, and one locator scoped the shared live region too narrowly. Both were test updates; the rerun above is green.

### Unrelated failure during the first full unit run
`npm test` (exit code 1), rerun green below; `serve.test.js` read its pid file while it was still being written.

```text
 ❯ tests/unit/serve.test.js (24 tests | 1 failed) 560ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/serve.test.js > the pid file and the stop file > writes the pid, exits cleanly when the stop file appears, and removes both files
AssertionError: expected +0 to be 32252 // Object.is equality
 ❯ tests/unit/serve.test.js:120:62
 Test Files  1 failed | 55 passed (56)
      Tests  1 failed | 1245 passed (1246)
```

### Final unit suite, after the docs and service worker version changes
`npm test` (exit code 0)

```text

> todos-webapp@0.4.1-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0228-add-a-rapid-entry-mode-where-adding-keeps


 Test Files  56 passed (56)
      Tests  1246 passed (1246)
   Start at  09:38:30
   Duration  11.32s (environment 52%, tests 34%, import 9%, transform 3%, worker 1%, setup 1%)

    Isolate  56 workers spawned · ~850ms startup each (spawn + environment, per file)
             at least ~5.95s faster with isolate: false — reuses workers across files instead of one per file
```

### Final lint
`npx eslint .` (exit code 0, no output)

```text
(no output)
```

### Final affected e2e specs
`npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js tests/e2e/bin-settings.spec.js tests/e2e/gallery-app.spec.js --reporter=line` (exit code 0)

```text

Running 70 tests using 4 workers

[... 68 lines omitted ...]
[69/70] [chromium] › tests\e2e\list.spec.js:338:3 › List screen › the status, due, and created filters apply, persist, and Reset restores manual order and open tasks (TV-12, VO-8)
[70/70] [chromium] › tests\e2e\list.spec.js:357:3 › List screen › a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16)
  70 passed (57.5s)
```

### Other checks
`node scripts/check-sw-version.mjs` (exit code 0)

```text
OK: 124 precached files match VERSION 2026-11-15.4.
```

`uvx ruff check scripts tests` and `uvx ruff format --check scripts tests` (exit code 0)

```text
All checks passed!
5 files already formatted
```

`python -m pytest -q tests/test_draw_wireframes.py` (exit code 0)

```text
84 passed in 0.87s
```

### Visual verification
Two Playwright webServers served the main checkout (before) and this worktree (after); every capture had no console errors, page errors, or failed requests.
Capture: seed Milk, Eggs, Bread, type Coffee, press Enter.

| Screen               | Before                                                       | After                                                      |
| :------------------- | :----------------------------------------------------------- | :--------------------------------------------------------- |
| Add bar, light 390   | [before](screenshots/before-add-bar-light-390.png)           | [after](screenshots/after-add-bar-light-390.png)           |
| Add bar, dark 390    | [before](screenshots/before-add-bar-dark-390.png)            | [after](screenshots/after-add-bar-dark-390.png)            |
| Add bar, light 1440  | [before](screenshots/before-add-bar-light-1440.png)          | [after](screenshots/after-add-bar-light-1440.png)          |
| Add bar, dark 1440   | [before](screenshots/before-add-bar-dark-1440.png)           | [after](screenshots/after-add-bar-dark-1440.png)           |
| Settings, light 390  | none                                                         | [on](screenshots/after-settings-light-390.png), [off](screenshots/after-settings-off-light-390.png)    |
| Settings, dark 390   | none                                                         | [on](screenshots/after-settings-dark-390.png), [off](screenshots/after-settings-off-dark-390.png)      |
| Settings, light 1440 | none                                                         | [on](screenshots/after-settings-light-1440.png), [off](screenshots/after-settings-off-light-1440.png)  |
| Settings, dark 1440  | none                                                         | [on](screenshots/after-settings-dark-1440.png), [off](screenshots/after-settings-off-dark-1440.png)    |

- Before: Enter only searched for "Coffee"; nothing was added.
- After, 390 px: Coffee is added and highlighted, the field is empty and focused, and no editor opens.
- After, 1440 px: Coffee is added and highlighted, and the editor opens beside the focused field.
