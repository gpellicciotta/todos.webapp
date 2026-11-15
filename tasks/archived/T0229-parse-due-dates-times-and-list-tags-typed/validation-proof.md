## Walkthrough & Validation

### Failing tests before the implementation

Command: `npx vitest run tests/unit/quick-add.test.js tests/unit/add-bar.test.js tests/unit/settings.test.js tests/unit/list.test.js` (filtered with `grep -E "FAIL|✓|×|Tests|Test Files|Error:"`)

Exit code: 1

```text
     × explains the add field syntax after the shortcuts and before the source link 15ms
     × keeps this list for a task added with typed syntax, and joins the tagged lists too 69ms
     × adds the trimmed description on submit, clears the field, and keeps focus (TSK-1) 94ms
       × adds the trimmed description on Shift+Enter, clears the field, and keeps focus 59ms
       × adds the trimmed description on Alt+Enter, clears the field, and keeps focus 62ms
       × still adds on an exact match 1015ms
       × previews the due time and lists under the field, which describes the field 2ms
       × updates the preview when the lists change, and hides it for a viewer 2ms
       × adds the parsed description, due time, and lists, while search keeps the raw text 2ms
       × reads Add anyway when the parsed description is a known task 3ms
       × shows text set from outside in the preview 3ms
     × names the description that Add creates, without the typed syntax 2ms
 FAIL  tests/unit/quick-add.test.js [ tests/unit/quick-add.test.js ]
Error: Cannot find module '../../src/js/core/quick-add.js' imported from C:/Dev-Projects/todos.webapp/.plan/work/T0229-parse-due-dates-times-and-list-tags-typed/tests/unit/quick-add.test.js
[... 6 lines omitted ...]
 FAIL  tests/unit/add-bar.test.js > createAddBar > typed syntax > shows text set from outside in the preview
TypeError: bar.setLists is not a function
 FAIL  tests/unit/add-bar.test.js > createAddHint > names the description that Add creates, without the typed syntax
AssertionError: expected 'Add creates a new task “Buy paint tom…' to be 'Add creates a new task “Buy paint”.' // Object.is equality
 FAIL  tests/unit/list.test.js > mountList > keeps this list for a task added with typed syntax, and joins the tagged lists too
AssertionError: expected 'Paint the door 2026-12-24 #work #home' to be 'Paint the door' // Object.is equality
 FAIL  tests/unit/settings.test.js > Keyboard shortcuts in About > explains the add field syntax after the shortcuts and before the source link
TypeError: Cannot read properties of null (reading 'textContent')
 Test Files  4 failed (4)
      Tests  12 failed | 49 passed (61)
```

Command: `E2E_PORT=8961 npx playwright test tests/e2e/all-tasks.spec.js -g "a due day, a time"` (last lines)

Exit code: 1

```text
      - Expect "toHaveText" locator('.add-bar__preview') with timeout 5000ms
      - waiting for locator('.add-bar__preview')

      495 |   await expect(preview).toBeHidden();
      496 |   await field.fill('Buy paint tomorrow 18:00 #home');
    > 497 |   await expect(preview).toHaveText('Due tomorrow 18:00 · List: Home');
          |                         ^
  1 failed
    [chromium] › tests\e2e\all-tasks.spec.js:489:1 › a due day, a time, and a list tag typed in the add field set the new task, with a preview first
```

### Passing tests after the implementation

Command: `npx vitest run` (last lines)

Exit code: 0

```text
 Test Files  56 passed (56)
      Tests  1228 passed (1228)
   Start at  02:42:00
   Duration  13.44s (environment 56%, tests 30%, import 9%, transform 3%, worker 1%, setup 1%)

    Isolate  56 workers spawned · ~1.03s startup each (spawn + environment, per file)
             at least ~7.24s faster with isolate: false — reuses workers across files instead of one per file

```

Command: `npx eslint .`

Exit code: 0 (no output)

```text
exit 0
```

Command: `node scripts/check-sw-version.mjs`

Exit code: 0

```text
OK: 124 precached files match VERSION 2026-11-15.2.
```

Command: `E2E_PORT=8961 npx playwright test tests/e2e/all-tasks.spec.js`

Exit code: 0

```text

Running 25 tests using 4 workers

  ✓   2 [chromium] › tests\e2e\all-tasks.spec.js:105:3 › a first visit shows the empty state without any sign-in at 390 px (LOC-1) (2.0s)
  ✓   1 [chromium] › tests\e2e\all-tasks.spec.js:105:3 › a first visit shows the empty state without any sign-in at 1440 px (LOC-1) (2.8s)
  ✓   3 [chromium] › tests\e2e\all-tasks.spec.js:160:1 › one click completes a task, x toggles the focused row, and Undo or Ctrl+Z sets it back (TSK-4) (3.3s)
  ✓   4 [chromium] › tests\e2e\all-tasks.spec.js:124:1 › Add adds a task, opens it, keeps focus in the add bar, and asks for persistent storage once (TSK-1, TSK-13, TEC-5) (3.8s)
  ✓   5 [chromium] › tests\e2e\all-tasks.spec.js:192:1 › the status menu changes a status by right-click and by keyboard (TSK-4) (2.4s)
  ✓   8 [chromium] › tests\e2e\all-tasks.spec.js:306:1 › the All tasks More menu holds only Edit view options (VO-4) (2.2s)
  ✓   9 [chromium] › tests\e2e\all-tasks.spec.js:316:1 › the view options open beside the rows on a wide layout, with Reset at the top and no Show button (VO-5, VO-6) (2.1s)
  ✓  10 [chromium] › tests\e2e\all-tasks.spec.js:334:1 › the view options fill the screen on a compact layout, end with Show N tasks, and work by keyboard (VO-5, VO-13) (2.1s)
  ✓  11 [chromium] › tests\e2e\all-tasks.spec.js:365:1 › the view options open from their route after a reload, and Reset in the panel restores the defaults (VO-8) (2.3s)
  ✓  13 [chromium] › tests\e2e\all-tasks.spec.js:404:1 › a row opens the task editor route, and the selected row is marked (1.5s)
  ✓  12 [chromium] › tests\e2e\all-tasks.spec.js:384:1 › Delete moves a task to the recycle bin and Undo brings it back, also with Ctrl+Z (TSK-11) (2.2s)
  ✓   7 [chromium] › tests\e2e\all-tasks.spec.js:229:3 › the view options, search, and the info line change the rows at 1440 px (TV-1 to TV-12, VO-1 to VO-8) (7.9s)
  ✓  14 [chromium] › tests\e2e\all-tasks.spec.js:416:1 › a store change while the status menu is open keeps the menu open and focused (1.9s)
  ✓   6 [chromium] › tests\e2e\all-tasks.spec.js:229:3 › the view options, search, and the info line change the rows at 390 px (TV-1 to TV-12, VO-1 to VO-8) (9.6s)
  ✓  15 [chromium] › tests\e2e\all-tasks.spec.js:440:1 › Reset in an empty result focuses search, and deleting the last shown row focuses the add bar (2.5s)
  ✓  17 [chromium] › tests\e2e\all-tasks.spec.js:489:1 › a due day, a time, and a list tag typed in the add field set the new task, with a preview first (1.9s)
  ✓  16 [chromium] › tests\e2e\all-tasks.spec.js:458:1 › typing in the add field searches, Enter never adds, and Add creates the task and clears the filter (VO-3, TSK-1) (3.5s)
  ✓  19 [chromium] › tests\e2e\all-tasks.spec.js:523:3 › Alt+Enter in the add field adds tasks in a row, each opening in the editor (TSK-1, TSK-13) (2.0s)
  ✓  18 [chromium] › tests\e2e\all-tasks.spec.js:523:3 › Shift+Enter in the add field adds tasks in a row, each opening in the editor (TSK-1, TSK-13) (3.1s)
  ✓  20 [chromium] › tests\e2e\all-tasks.spec.js:546:1 › on a compact screen, the task editor takes the focus after an add, as it covers the add field (TSK-13) (1.4s)
  ✓  22 [chromium] › tests\e2e\all-tasks.spec.js:580:1 › a task added while the Lists filter selects lists joins no list, and Show reveals it (2.9s)
  ✓  24 [chromium] › tests\e2e\all-tasks.spec.js:666:1 › search and sort apply inside each group, and a task of two lists shows in both (VO-10, VO-11) (2.8s)
  ✓  21 [chromium] › tests\e2e\all-tasks.spec.js:559:1 › adding a task that the view options hide shows a toast whose Show resets those options (VO-3) (4.0s)
  ✓  23 [chromium] › tests\e2e\all-tasks.spec.js:627:1 › Group by shows headers with counts for each option, and the choice survives a reload (VO-9 to VO-12, TV-12) (3.5s)
  ✓  25 [chromium] › tests\e2e\all-tasks.spec.js:690:1 › Finished today only shows open tasks and the tasks finished today, survives a reload, and Reset clears it (TV-14) (2.3s)

  25 passed (22.3s)
```

Command: `E2E_PORT=8961 npx playwright test` (full suite, last lines)

Exit code: 1, from one test that passes alone and in a rerun of its spec, below.

```text
  1 failed
    [chromium] › tests\e2e\shell.spec.js:381:3 › the wide layout places the add bar, editor, and floating button in shell areas 
  203 passed (2.4m)
```

Command: `E2E_PORT=8961 npx playwright test tests/e2e/shell.spec.js tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js` (last lines)

Exit code: 0

```text
  ✓  59 [chromium] › tests\e2e\shell.spec.js:381:3 › the compact layout places the add bar, editor, and floating button in shell areas (1.8s)
  ✓  38 [chromium] › tests\e2e\list.spec.js:303:3 › List screen › a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16) (21.9s)

  60 passed (50.9s)
```

### Visual check

Command: `node {{temp}}/shoot.mjs {{worktree}} {{main-checkout}} {{companion-dir}}` serves the main checkout (before) and the worktree (after), seeds Home and Work, and types `Buy paint tomorrow 18:00 #home`.

Exit code: 0

```text
No console errors, page errors, or HTTP errors.
```

| Width   | Theme | Before                                         | After                                        |
| :------ | :---- | :--------------------------------------------- | :------------------------------------------- |
| 390 px  | light | [before-390-light.png](before-390-light.png)   | [after-390-light.png](after-390-light.png)   |
| 390 px  | dark  | [before-390-dark.png](before-390-dark.png)     | [after-390-dark.png](after-390-dark.png)     |
| 1440 px | light | [before-1440-light.png](before-1440-light.png) | [after-1440-light.png](after-1440-light.png) |
| 1440 px | dark  | [before-1440-dark.png](before-1440-dark.png)   | [after-1440-dark.png](after-1440-dark.png)   |

The preview line "Due tomorrow 18:00 · List: Home" sits under the field, aligned with the info line, in every capture.
