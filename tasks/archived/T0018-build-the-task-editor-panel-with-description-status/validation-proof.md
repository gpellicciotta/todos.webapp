## Walkthrough & Validation
The editor panel mounts the editor of each editor route into the shell's `[data-editor-slot]` element.
`editor-panel.js` is generic: title, close button, scrolling body, Escape, focus return, and `createField`.
`task-editor.js` saves each field on change; `notes.js` builds the note thread, newest first.
`app.js` registers the task editor; `views.css` sizes the panel and styles the Add to list box.

### Red Phase
The new tests ran before any editor code existed.

Command: `npx vitest run tests/unit/task-editor.test.js` (exit code 1)

```text
[... 7 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js [ tests/unit/task-editor.test.js ]
Error: Failed to resolve import "../../src/js/views/editor-panel.js" from "tests/unit/task-editor.test.js". Does the file exist?
[... 19 lines omitted ...]
 Test Files  1 failed (1)
      Tests  no tests
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8813 npx playwright test tests/e2e/task-editor.spec.js --timeout 10000` (exit code 1)

```text
[... 1 lines omitted ...]
Running 7 tests using 4 workers
[... 1 lines omitted ...]
  x  1 [chromium] › tests\e2e\task-editor.spec.js:122:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (6.1s)
  x  2 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (6.1s)
  x  4 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (6.3s)
  x  3 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (6.4s)
  x  5 [chromium] › tests\e2e\task-editor.spec.js:146:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (5.9s)
  x  6 [chromium] › tests\e2e\task-editor.spec.js:178:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (5.9s)
  x  7 [chromium] › tests\e2e\task-editor.spec.js:201:1 › Undo in the delete toast restores the task (5.5s)
[... 6 lines omitted ...]
    Locator: locator('[data-editor-slot] .editor-panel')
[... 33 lines omitted ...]
    Locator: locator('[data-editor-slot] .editor-panel')
[... 33 lines omitted ...]
    Locator: locator('[data-editor-slot] .editor-panel')
[... 33 lines omitted ...]
    Locator: locator('[data-editor-slot] .editor-panel')
[... 33 lines omitted ...]
    Locator: locator('[data-editor-slot] .editor-panel')
[... 33 lines omitted ...]
    Locator: locator('[data-editor-slot] .editor-panel')
[... 33 lines omitted ...]
    Locator: locator('[data-editor-slot] .editor-panel')
[... 29 lines omitted ...]
  7 failed
[... 7 lines omitted ...]
```

### Green Phase
One test changed during green: Due date and Due time use exact labels, since Clear's name holds "due date".
The working tree also holds T0020's in-progress files; every check ran against that shared tree.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  26 passed (26)
      Tests  542 passed (542)
   Start at  20:17:42
   Duration  18.55s (environment 74%, tests 12%, import 9%, worker 3%, transform 2%)

    Isolate  26 workers spawned · ~3.27s startup each (spawn + environment, per file)
             at least ~8.88s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `E2E_PORT=8813 npm run test:e2e` (exit code 0)

```text
[... 5 lines omitted ...]
Running 94 tests using 4 workers
[... 87 lines omitted ...]
  ok 89 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (1.2s)
  ok 88 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (1.4s)
  ok 91 [chromium] › tests\e2e\task-editor.spec.js:122:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (1.9s)
  ok 90 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.5s)
  ok 93 [chromium] › tests\e2e\task-editor.spec.js:178:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (1.7s)
[... 1 lines omitted ...]
  ok 94 [chromium] › tests\e2e\task-editor.spec.js:201:1 › Undo in the delete toast restores the task (2.2s)
  ok 92 [chromium] › tests\e2e\task-editor.spec.js:146:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (4.2s)
[... 1 lines omitted ...]
  94 passed (56.5s)
```

`npm run check:sw` fails as expected: VERSION is bumped at commit time, across T0018 and T0020.

Command: `npm run check:sw` (exit code 1)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

ERROR: precached files changed but VERSION is still 2026-11-04.9:
  css/views.css
  js/app.js
  js/core/preferences.js
  js/ui/layout.js
  js/version.js
  js/views/editor-panel.js
  js/views/notes.js
  js/views/recycle-bin.js
  js/views/settings.js
  js/views/task-editor.js
Bump VERSION in service-worker.js, then run: node scripts/check-sw-version.mjs --update
```

### Visual Check
Captured with a throwaway Playwright script and an in-process server; it reported HTTP 200 and no console errors.
The seed holds three lists, three tasks, and one task with two lists, a due time, and two notes, one edited.

| View              | Before                                                   | After                                                            |
| :---------------- | :------------------------------------------------------- | :--------------------------------------------------------------- |
| 390 light         | [before](screenshots/task-editor-390-light-before.png)   | [after](screenshots/task-editor-390-light-after.png)             |
| 390 dark          | [before](screenshots/task-editor-390-dark-before.png)    | [after](screenshots/task-editor-390-dark-after.png)              |
| 1440 light        | [before](screenshots/task-editor-1440-light-before.png)  | [after](screenshots/task-editor-1440-light-after.png)            |
| 1440 dark         | [before](screenshots/task-editor-1440-dark-before.png)   | [after](screenshots/task-editor-1440-dark-after.png)             |
| Notes, 390 light  | none                                                     | [after](screenshots/task-editor-390-light-end-after.png)         |
| Notes, 1440 dark  | none                                                     | [after](screenshots/task-editor-1440-dark-end-after.png)         |
| Deleted, 390 dark | none                                                     | [after](screenshots/task-editor-390-dark-deleted-after.png)      |
| Deleted, 1440     | none                                                     | [after](screenshots/task-editor-1440-light-deleted-after.png)    |

- Before, the route marked the row but showed no editor.
- The first deleted view dimmed every value to the disabled color and kept unusable controls.
  Values now use the muted text color; Clear, Add to list, and chip remove buttons hide.
- Clear wraps below the date and time fields in the 25rem panel; ui-design.md records it.

### Review Rework
Round 1 found that Chromium's date field fires `change` per digit, saving years such as 0202 while typing.
- The due date and time now save once focus leaves both fields; a year below 1000 is a field error.
- A read that ends after `destroy()` neither fills the panel nor closes it.
- A focused field left unchanged shows the newest stored value; field errors go to a polite live region.
- Escape in a note's edit field cancels that edit only; a typed new note stays as a draft for the session.
- The Undo e2e test merged into the Delete task test; the unit tests now leave the due fields to save.

The new tests ran before the fix:

Command: `npx vitest run tests/unit/task-editor.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × saves the due date and time only when the field is left, not on each change while typing 18ms
     × shows a field error for a year with fewer than four digits and saves nothing 11ms
     × announces a field error through a live region 1017ms
     × fills a focused field that was left unchanged with the newest stored value 77ms
     × cancels only the note edit on Escape in its field 75ms
     × keeps a typed note draft when the editor closes, and shows it again on reopening 10ms
     × neither fills nor closes the panel when a read finishes after the editor was destroyed 95ms
[... 1 lines omitted ...]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 7 ⎯⎯⎯⎯⎯⎯⎯
[... 1 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > saves the due date and time only when the field is left, not on each change while typing
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 3 times
[... 43 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > shows a field error for a year with fewer than four digits and saves nothing
AssertionError: expected null to be 'Enter a four-digit year.' // Object.is equality
[... 17 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > announces a field error through a live region
AssertionError: expected undefined to be 'Enter a description.' // Object.is equality
[... 17 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > fills a focused field that was left unchanged with the newest stored value
AssertionError: expected 'Buy paint' to be 'Buy paint, changed in another tab' // Object.is equality
[... 14 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > cancels only the note edit on Escape in its field
AssertionError: expected <textarea …(4)></textarea> to be null
[... 22 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > keeps a typed note draft when the editor closes, and shows it again on reopening
AssertionError: expected '' to be 'Ask about the primer' // Object.is equality
[... 16 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > neither fills nor closes the panel when a read finishes after the editor was destroyed
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
[... 22 lines omitted ...]
      Tests  7 failed | 8 passed (15)
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8813 npx playwright test tests/e2e/task-editor.spec.js -g "typing a due date" --timeout 15000` (exit code 1)

```text
[... 1 lines omitted ...]
Running 1 test using 1 worker
[... 1 lines omitted ...]
  x  1 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (1.3s)
[... 4 lines omitted ...]
    Error: expect(received).toBeNull()
[... 1 lines omitted ...]
    Received: "2026-05-11T07:30:00.000Z"
[... 3 lines omitted ...]
    > 140 |   expect(await stored()).toBeNull();
[... 16 lines omitted ...]
  1 failed
[... 1 lines omitted ...]
```

After the fix, in the working tree with T0020's in-progress files:

Command: `npm test` (exit code 0)

```text
[... 1 lines omitted ...]
> todos-webapp@0.1.0-pre test
> vitest run
[... 5 lines omitted ...]
 Test Files  26 passed (26)
      Tests  549 passed (549)
[... 5 lines omitted ...]
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `E2E_PORT=8813 npm run test:e2e` (exit code 0)

```text
[... 5 lines omitted ...]
Running 94 tests using 4 workers
[... 87 lines omitted ...]
  ok 89 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (847ms)
  ok 88 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (1.3s)
  ok 90 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.4s)
  ok 91 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (1.7s)
  ok 92 [chromium] › tests\e2e\task-editor.spec.js:149:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (2.5s)
  ok 94 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (1.9s)
  ok 93 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (2.3s)
[... 2 lines omitted ...]
  94 passed (54.3s)
```

`npm run check:sw` still fails as expected until VERSION is bumped at commit time.

### Split and Back Fix
Round 2 found that Back while typing a due date lost it: the editor closed before the focusout timer saved.
`destroy()` now saves a typed, valid description or due date and time before it stops.
The notes thread moved to T0040 for size; stage 1 here is main plus the editor without notes.
- The unit test that waited on `notesOfTask` now waits on `listsOfTask`, which both stages call.

The new test ran in the working tree before the fix:

Command: `npx vitest run tests/unit/task-editor.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × saves a typed due date and description when the editor closes before focus leaves them 1012ms
[... 1 lines omitted ...]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
[... 1 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > saves a typed due date and description when the editor closes before focus leaves them
AssertionError: expected "vi.fn()" to be called with arguments: [ 't1', { 'due-time': '2026-11-08' } ]
[... 15 lines omitted ...]
      Tests  1 failed | 15 passed (16)
[... 2 lines omitted ...]
```

The stage 1 checks ran in a fresh tree: `git archive main` extracted, the stage 1 snapshot copied over,
a `node_modules` junction, and the precache hashes regenerated for VERSION 2026-11-04.10.

Command: `npm test` (exit code 0)

```text
[... 1 lines omitted ...]
> todos-webapp@0.1.0-pre test
> vitest run
[... 5 lines omitted ...]
 Test Files  24 passed (24)
      Tests  535 passed (535)
[... 5 lines omitted ...]
```

Command: `npx eslint .` (exit code 0)

```text

```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 42 precached files match VERSION 2026-11-04.10.
```

Command: `E2E_PORT=8831 npx playwright test` (exit code 0)

```text
[... 1 lines omitted ...]
Running 89 tests using 4 workers
[... 83 lines omitted ...]
  ok 84 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (1.0s)
  ok 85 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (1.2s)
  ok 86 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.4s)
  ok 87 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (1.4s)
  ok 88 [chromium] › tests\e2e\task-editor.spec.js:149:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (1.8s)
  ok 89 [chromium] › tests\e2e\task-editor.spec.js:173:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (1.3s)
[... 2 lines omitted ...]
  89 passed (44.1s)
```
