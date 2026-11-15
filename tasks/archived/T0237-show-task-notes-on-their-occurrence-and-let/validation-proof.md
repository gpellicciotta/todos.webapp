## Walkthrough & Validation

### Key Changes
- Store: `addNote` links notes on recurring tasks by period; `editNote` changes text, link, or both.
- Sync: create and edit entries send `occurrence`; undo, merge, conflicts, and adoption carry the link.
- Views: the thread shows global then current-occurrence notes; history lists notes per occurrence; edit form has Belongs to.

### Red phase: affected unit tests
Command: `npx vitest run tests/unit/store-notes.test.js tests/unit/queue.test.js tests/unit/merge.test.js tests/unit/adopt.test.js tests/unit/task-editor.test.js`
Exit code: 1

```text
 FAIL  tests/unit/adopt.test.js > adopting local data on first connect > uploads the occurrence link of each note
 FAIL  tests/unit/merge.test.js > merging a pulled row > keeps the local link of a note while its link change is queued, and takes the service text
 FAIL  tests/unit/queue.test.js > queued note links > restores the previous link and text when a rejected note edit is undone
 FAIL  tests/unit/queue.test.js > queued note links > sends only the changed note fields, each with its edit time
 FAIL  tests/unit/queue.test.js > queued note links > sends the occurrence of a linked or explicitly global note, and leaves an unplaced one to the service
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > changes and clears a link, setting the last update time and keeping the text
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > keeps a note on a one-off task global unless the caller links it
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > links a note on a recurring task to the occurrence whose period holds its creation time
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > refuses a link past the current occurrence with a conflict
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > refuses a link to 0
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > refuses a link to a fraction
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > refuses a link to a string
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > lists the global notes, then the notes of the current occurrence marked with it, and leaves past ones to the history
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > lists the notes of each occurrence under it in the history, newest first
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > offers Whole task and each occurrence, newest first, in the note edit form, and saves the chosen link
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > offers the link choice on a one-off task too
[... 321 lines omitted ...]
AssertionError: expected [ [ 'Linked', undefined ], …(1) ] to deeply equal [ [ 'Linked', 1 ], …(1) ]
AssertionError: expected [ undefined, undefined, undefined ] to deeply equal [ 1, null, undefined ]
AssertionError: expected null to be 1 // Object.is equality
AssertionError: expected { id: 'n1', 'task-id': 't1', …(6) } to match object { text: 'Theirs', occurrence: 2 }
AssertionError: expected …(5) to have a length of 3 but got 5
AssertionError: promise resolved "{ …(7) }" instead of rejecting
TypeError: Cannot read properties of null (reading 'options')
ValidationError: A note needs a text.
 Test Files  5 failed (5)
      Tests  16 failed | 117 passed (133)
```

### Red phase: note link conflict assertion
Added after the first red run; checked against the `merge.js` of `HEAD`, then restored.

Command: `npx vitest run tests/unit/merge.test.js -t "kept text and link"`
Exit code: 1

```text
     × applies the kept position of a membership and the kept text and link of a note 13ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected null to be 1 // Object.is equality
      Tests  1 failed | 28 skipped (29)
```

### Red phase: contract suite against a local todos.server
The server is a fresh clone of todos.server `b202516`, built with `./gradlew :server:installDist -x test -PtodosWebappDir=../../../../src`.

Command: `TODOS_SERVER_DIR=node_modules/.cache/t0237/todos-server npm run test:contract`
Exit code: 1

```text
     × posts a note linked to its occurrence, then makes it global and links it again 44ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/contract/sync.contract.test.js > the sync client against a real todos server > posts a note linked to its occurrence, then makes it global and links it again
AssertionError: expected null to be 1 // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
```

### Red phase: e2e scenario
Command: `npx playwright test tests/e2e/task-editor.spec.js -g "note on a daily task"`
Exit code: 1

```text
Running 1 test using 1 worker
  ✘  1 [chromium] › tests\e2e\task-editor.spec.js:326:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global (6.0s)
  1) [chromium] › tests\e2e\task-editor.spec.js:326:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global
    Error: expect(locator).toContainText(expected) failed
    Locator: locator('[data-editor-slot] .editor-panel').locator('.note').filter({ hasText: 'Watered the roses.' }).locator('.note__occurrence')
    Expected substring: "#1"
    Timeout: 5000ms
    Error: element(s) not found
    Call log:
[... trace lines omitted ...]
```

### Green phase: full unit suite
Command: `npx vitest run`
Exit code: 0

```text
 Test Files  60 passed (60)
      Tests  1417 passed (1417)
   Start at  14:03:02
   Duration  12.08s (environment 50%, tests 35%, import 10%, transform 3%, worker 1%, setup 1%)
    Isolate  60 workers spawned · ~819ms startup each (spawn + environment, per file)
             at least ~6.20s faster with isolate: false — reuses workers across files instead of one per file
```

### Green phase: lint and service worker precache
Command: `npm run lint`
Exit code: 0

```text
> todos-webapp@0.4.1-pre lint
> eslint .
```

Command: `npm run check:sw`
Exit code: 0

```text
> todos-webapp@0.4.1-pre check:sw
> node scripts/check-sw-version.mjs
OK: 128 precached files match VERSION 2026-11-15.14.
```

### Green phase: contract suite against a local todos.server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0237/todos-server npm run test:contract`
Exit code: 0

```text
> todos-webapp@0.4.1-pre test:contract
> vitest run --config vitest.contract.config.js
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0237-show-task-notes-on-their-occurrence-and-let
 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  13:58:50
   Duration  3.51s (tests 92%, transform 4%, import 4%)
```

### Green phase: task editor e2e spec
Command: `npx playwright test tests/e2e/task-editor.spec.js`
Exit code: 0

```text
Running 10 tests using 4 workers
  ✓   2 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (2.5s)
  ✓   1 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (2.7s)
  ✓   3 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (4.9s)
  ✓   4 [chromium] › tests\e2e\task-editor.spec.js:131:1 › ticks a target-3 task to 3/3 and edits its deadline through the lifecycle rules in local mode (5.0s)
  ✓   5 [chromium] › tests\e2e\task-editor.spec.js:182:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (3.0s)
  ✓   6 [chromium] › tests\e2e\task-editor.spec.js:209:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (3.6s)
  ✓   8 [chromium] › tests\e2e\task-editor.spec.js:265:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.3s)
  ✓   7 [chromium] › tests\e2e\task-editor.spec.js:233:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (4.1s)
  ✓   9 [chromium] › tests\e2e\task-editor.spec.js:292:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over (3.9s)
  ✓  10 [chromium] › tests\e2e\task-editor.spec.js:326:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global (3.9s)
  10 passed (11.8s)
```

### Full e2e suite
Command: `npx playwright test`
Exit code: 1

One unrelated shell layout test failed under the full parallel run; it passes alone, so it is load-flaky.

```text
  ✘  193 [chromium] › tests\e2e\shell.spec.js:381:3 › the compact layout places the add bar, editor, and floating button in shell areas (2.7s)
    TypeError: Cannot read properties of null (reading 'y')
  1 failed
  209 passed (2.2m)
```

Command: `npx playwright test tests/e2e/shell.spec.js`
Exit code: 0

```text
  22 passed (12.0s)
```

### Visual verification
Captured with a throwaway Playwright spec: a daily task with two notes, one in edit mode, history open.
Light and dark, 1440 px and 390 px; the spec failed on console errors, page errors, and HTTP 400 or higher, and none occurred.

| View    | Before                                                      | After                                                     |
| :------ | :---------------------------------------------------------- | :-------------------------------------------------------- |
| Notes   | [light 1440](screenshots/before-light-1440-notes.png)       | [light 1440](screenshots/after-light-1440-notes.png)      |
| Notes   | [dark 390](screenshots/before-dark-390-notes.png)           | [dark 390](screenshots/after-dark-390-notes.png)          |
| History | [light 1440](screenshots/before-light-1440-history.png)     | [light 1440](screenshots/after-light-1440-history.png)    |
| History | [dark 390](screenshots/before-dark-390-history.png)         | [dark 390](screenshots/after-dark-390-history.png)        |

All eight captures per phase are in `screenshots/`, for light and dark at 1440 px and 390 px.

### Review Round 1 Rework

#### Key Changes
- `addNote` links by the newest occurrence that began by the creation time, as the server's `defaultLink` does.
- `edit-note` requests send `edit-times` in the body.
- The thread lists earlier-occurrence notes after the current ones, with Edit and Delete on own notes.
- Belongs to offers occurrences 1 to the current one; while connected, the edit form labels them from the server.
- An open history redraws its notes on note changes.
- CHANGELOG consolidated to one entry; added doc sentences trimmed to 20 words or fewer.

#### Red phase: affected unit tests
Command: `npx vitest run tests/unit/push.test.js tests/unit/store-notes.test.js tests/unit/task-editor.test.js`
Exit code: 1

Two older view tests fail only because the daily fixture now shows 5 notes.

```text
 FAIL  tests/unit/push.test.js > uploading the queue > sends the changed note fields of an edit with their edit times
 FAIL  tests/unit/store-notes.test.js > note links to occurrences > links by the newest occurrence that began by the creation time, as the service does
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > keeps own notes of earlier occurrences editable and deletable
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > lists the global notes, then the current occurrence, then earlier ones, each linked note marked with its occurrence
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > lists the notes of each occurrence under it in the history, newest first
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > offers Whole task and each occurrence, newest first, in the note edit form, and saves the chosen link
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > offers every occurrence up to the current one, even when the store holds only the current one
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > note links > shows note changes in an open history without a refresh
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor note links while connected > labels the earlier occurrences of the link choice from the server occurrences
[... 94 lines omitted ...]
AssertionError: expected 1 to be null
AssertionError: expected { text: 'Hello', occurrence: 1 } to deeply equal { text: 'Hello', occurrence: 1, …(1) }
AssertionError: expected …(3) to have a length of 5 but got 3
TypeError: Cannot read properties of undefined (reading 'textContent')
 Test Files  3 failed (3)
      Tests  9 failed | 94 passed (103)
```

#### Contract case for two-device note link merges
With `src/js/sync/push.js` of `4141dfc`, the new case already passes.
The `Edit-Time` header gives the server the same merge, since one entry's fields share one time.
The unit push test is the red proof for the body field; the contract case covers the end-to-end merge.

Command: `TODOS_SERVER_DIR=node_modules/.cache/t0237/todos-server npx vitest run --config vitest.contract.config.js -t "merges note edits"`
Exit code: 0

```text
 Test Files  1 passed (1)
      Tests  1 passed | 11 skipped (12)
```

#### Green phase: full unit suite
Command: `npx vitest run`
Exit code: 0

```text
 Test Files  60 passed (60)
      Tests  1423 passed (1423)
   Start at  14:28:46
   Duration  11.76s (environment 48%, tests 37%, import 10%, transform 2%, worker 1%, setup 1%)
    Isolate  60 workers spawned · ~775ms startup each (spawn + environment, per file)
             at least ~5.87s faster with isolate: false — reuses workers across files instead of one per file
```

#### Green phase: lint and service worker precache
Command: `npm run lint`
Exit code: 0

```text
> todos-webapp@0.4.1-pre lint
> eslint .
```

Command: `npm run check:sw`
Exit code: 0

```text
> todos-webapp@0.4.1-pre check:sw
> node scripts/check-sw-version.mjs
OK: 128 precached files match VERSION 2026-11-15.15.
```

#### Green phase: contract suite against a local todos.server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0237/todos-server npm run test:contract`
Exit code: 0

```text
> todos-webapp@0.4.1-pre test:contract
> vitest run --config vitest.contract.config.js
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0237-show-task-notes-on-their-occurrence-and-let
 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  14:29:51
   Duration  3.70s (tests 94%, import 4%, transform 3%)
```

#### Green phase: task editor e2e spec
Command: `npx playwright test tests/e2e/task-editor.spec.js`
Exit code: 0

```text
Running 10 tests using 4 workers
  ✓   2 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (3.4s)
  ✓   4 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (3.4s)
  ✓   3 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (4.1s)
  ✓   1 [chromium] › tests\e2e\task-editor.spec.js:131:1 › ticks a target-3 task to 3/3 and edits its deadline through the lifecycle rules in local mode (4.2s)
  ✓   5 [chromium] › tests\e2e\task-editor.spec.js:182:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (2.4s)
  ✓   8 [chromium] › tests\e2e\task-editor.spec.js:265:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (3.0s)
  ✓   6 [chromium] › tests\e2e\task-editor.spec.js:209:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (3.9s)
  ✓   7 [chromium] › tests\e2e\task-editor.spec.js:233:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (4.7s)
  ✓   9 [chromium] › tests\e2e\task-editor.spec.js:292:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over (3.1s)
  ✓  10 [chromium] › tests\e2e\task-editor.spec.js:326:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global (3.1s)
  10 passed (11.8s)
```

#### Green phase: full e2e suite
Command: `npx playwright test`
Exit code: 0

```text
  210 passed (2.2m)
```

#### Visual verification after the rework
The capture spec rolls the daily task over and adds a global note and an occurrence 2 note.
No console errors, page errors, or HTTP 400 or higher responses occurred.

| View    | Light 1440 px                                              | Dark 390 px                                              |
| :------ | :--------------------------------------------------------- | :------------------------------------------------------- |
| Notes   | [after-r2](screenshots/after-r2-light-1440-notes.png)      | [after-r2](screenshots/after-r2-dark-390-notes.png)      |
| History | [after-r2](screenshots/after-r2-light-1440-history.png)    | [after-r2](screenshots/after-r2-dark-390-history.png)    |
