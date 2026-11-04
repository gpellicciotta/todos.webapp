## Walkthrough & Validation
`notes.js` builds the task editor's note thread: the add note field on top, then notes newest first.
Each note shows its author, time, and an "edited" mark; own notes have Edit and Delete in a More menu.
Deleting asks in place; Escape in an edit field cancels only that edit; a typed new note stays as a session draft.
`task-editor.js` mounts the thread in its Notes section, and the service worker precaches `notes.js`.
The code and tests were written during T0018 and split out for size; screenshots live with T0018.
ui-design.md also changed, an undeclared file: it links notes.js and records the Escape and draft rules.

### Red Phase
The notes tests ran against stage 1, the editor without notes, in its fresh tree.

Command: `npx vitest run tests/unit/task-editor.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × cancels only the note edit on Escape in its field 1016ms
     × keeps a typed note draft when the editor closes, and shows it again on reopening 4ms
     × shows a field error for an empty note and adds nothing (NOT-1) 4ms
[... 1 lines omitted ...]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
[... 1 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > cancels only the note edit on Escape in its field
AssertionError: expected null not to be null
[... 10 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > keeps a typed note draft when the editor closes, and shows it again on reopening
[... 11 lines omitted ...]
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > shows a field error for an empty note and adds nothing (NOT-1)
[... 13 lines omitted ...]
      Tests  3 failed | 13 passed (16)
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8833 npx playwright test tests/e2e/task-editor.spec.js -g "a new note" --timeout 10000` (exit code 1)

```text
[... 1 lines omitted ...]
Running 1 test using 1 worker
[... 1 lines omitted ...]
  x  1 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (10.2s)
[... 6 lines omitted ...]
    Error: locator.fill: Test timeout of 10000ms exceeded.
[... 23 lines omitted ...]
  1 failed
[... 1 lines omitted ...]
```

### Green Phase
Stage 2 ran in a fresh tree: `git archive main` extracted, the stage 2 snapshot copied over,
a `node_modules` junction, and the precache hashes regenerated for VERSION 2026-11-04.12.

Command: `npm test` (exit code 0)

```text
[... 1 lines omitted ...]
> todos-webapp@0.1.0-pre test
> vitest run
[... 5 lines omitted ...]
 Test Files  24 passed (24)
      Tests  538 passed (538)
[... 5 lines omitted ...]
```

Command: `npx eslint .` (exit code 0)

```text

```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 43 precached files match VERSION 2026-11-04.12.
```

Command: `E2E_PORT=8832 npx playwright test` (exit code 0)

```text
[... 1 lines omitted ...]
Running 90 tests using 4 workers
[... 83 lines omitted ...]
  ok 85 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (1.1s)
  ok 84 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (1.3s)
  ok 86 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.1s)
  ok 87 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (1.7s)
  ok 88 [chromium] › tests\e2e\task-editor.spec.js:149:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (2.0s)
  ok 89 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (2.2s)
  ok 90 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (1.7s)
[... 2 lines omitted ...]
  90 passed (44.5s)
```
