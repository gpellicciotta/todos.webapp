## Walkthrough & Validation

### Summary
- `src/js/core/occurrences.js` folds events by `creation-time`, then `id`, and ignores failed preconditions.
- Database version 5 adds `occurrences` and `events`, and `src/js/store/migrate.js` converts tasks, notes, and queued changes.
- The store maps status edits onto events, deadline edits onto rules, and moves `last-update-time` on every part change.
- The queue posts events and rule edits, the merge folds queued events onto pulled occurrences, and adoption replays events.
- Views, overdue expiry, and backup format 1 read the current occurrence.
- The contract harness runs the server jar directly, since `devops.py server start` lost `--port` and `--env-file`.
- The contract server is a read-only clone of todos.server `bbe3174`, built in the ignored `node_modules/.cache/t0224/`.

### Red phase: unit tests before the implementation
Command: `npx vitest run tests/unit/occurrences.test.js tests/unit/store-db.test.js tests/unit/store-tasks.test.js tests/unit/store-notes.test.js tests/unit/queue.test.js tests/unit/push.test.js tests/unit/merge.test.js tests/unit/backup.test.js`
Exit code: 1

```text
 FAIL  tests/unit/backup.test.js [ tests/unit/backup.test.js ]
 FAIL  tests/unit/occurrences.test.js [ tests/unit/occurrences.test.js ]
 FAIL  tests/unit/merge.test.js > merging a pulled row > replaces the cached rules and current occurrence with the server copy, then reapplies queued events
 FAIL  tests/unit/push.test.js > handling replies > reverts an event answered 409 and logs it like other rejected changes
 FAIL  tests/unit/queue.test.js > queued events and rule edits > undoes a rejected event and refolds the events queued after it
 FAIL  tests/unit/store-db.test.js > the version 5 migration > maps every status onto occurrence 1 and the events of the server migration
 FAIL  tests/unit/store-tasks.test.js > updateTask > maps every status edit onto the events that reach it
[... 36 FAIL lines omitted ...]
Error: Cannot find module '../../src/js/core/occurrences.js' imported from C:/Dev-Projects/todos.webapp/.plan/work/T0224-adopt-task-entries-status-entries-recurring-tasks-and/tests/unit/backup.test.js
ValidationError: Unknown status: ready.
[... other error lines omitted ...]
 Test Files  8 failed (8)
      Tests  41 failed | 89 passed (130)
```

### Red phase: contract suite before the implementation
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0224/todos-server npm run test:contract`
Exit code: 1

```text
     × adopts local lists and tasks on first connect, merges same-named lists, and repeats without duplicates 423ms
     × merges edits of two devices: different fields both survive, and the later edit of one field wins 179ms
     × ticks a target-3 task three times through events, and another device sees it completed 141ms
     × reverts an event the server refuses with 409 81ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [ 2, +0, +0 ] to deeply equal [ 2, 3, 3 ]
TypeError: phone.store.postEvent is not a function
TypeError: ada.store.postEvent is not a function
 Test Files  1 failed (1)
      Tests  4 failed | 4 passed | 1 expected fail (9)
```

### Red phase: contract harness unit test before its repair
Command: `npx vitest run tests/unit/contract-server.test.js`
Exit code: 1

```text
 FAIL  tests/unit/contract-server.test.js > the contract test server helper > starts the built server jar on an in-memory database, with the environment file and port
 FAIL  tests/unit/contract-server.test.js > the contract test server helper > stops the server process through processes kill
      Tests  2 failed | 3 passed (5)
```

### Green: lint and service worker check
Commands: `npx eslint .` (exit code 0, no output) and `npm run check:sw` (exit code 0)

```text
OK: 125 precached files match VERSION 2026-11-15.1.
```

### Green: unit suite
Command: `npm test`
Exit code: 0

```text
 Test Files  56 passed (56)
      Tests  1221 passed (1221)
```

### Green: contract suite against a local todos.server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0224/todos-server npm run test:contract`
Exit code: 0

```text
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

The 9 tests include the target-3 tick through three `complete` events, the `409` rollback, and the note adoption.
The note test was `it.fails`; it passes now that todos.server T0207 is complete, so it is `it`.
`processes list --cwd node_modules/.cache/t0224/todos-server` printed `(empty)` after the run.

### Green: e2e suite
Command: `npm run test:e2e -- --reporter=line`
Exit code: 0

```text
[199/201] [chromium] › tests\e2e\task-editor.spec.js:157:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8)
[200/201] [chromium] › tests\e2e\task-editor.spec.js:181:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5)
[201/201] [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6)
  201 passed (2.1m)
```

### Mechanical changes
- `sed -i 's/status-todo/status-ready/g' src/img/icons.svg src/css/app-components.css src/demo/visual-style-gallery.html`
- `sed -i 's/data-status="todo"/data-status="ready"/g; s/value="todo"/value="ready"/g' src/demo/visual-style-gallery.html`
- `node scripts/check-sw-version.mjs --update` after the service worker `VERSION` bump.
