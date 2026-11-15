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
- `node scripts/check-sw-version.mjs --update` after each service worker `VERSION` bump, now `2026-11-15.2`.

## Review Round 1 Rework

### Fixes
- D1: `ownsNote` in `src/js/views/notes.js` compares `owner-id` with the connected user; others show Collaborator or Former member.
- D1: `planDisconnect` clears the service `owner-id` of kept tasks and notes.
- D2: rolling back an event or rule edit rewrites `undo.before` of the later queued events of that task.
- D3: migrated `post-event` entries keep their `undo.before`, and migrated `update-rules` entries their `undo.fields`.
- D4: `normalizeRules` keeps `due-time` and `overdue-handling` null on recurring rules; format 1 import keeps recurring rules.
- D5: `planDisconnect` gives kept tasks events that reproduce their occurrence, so a later adoption keeps the status.
- P2: the changelog uses the FrontEnd and DevEx areas, in four bullets.

### Red phase: the new tests with the source fixes reverse-applied
Commands: `git diff -- src > r2-src.patch`, `git apply -R r2-src.patch`, the vitest run below, then `git apply r2-src.patch`.
Command: `npx vitest run tests/unit/occurrences.test.js tests/unit/store-tasks.test.js tests/unit/backup.test.js tests/unit/queue.test.js tests/unit/push.test.js tests/unit/store-db.test.js tests/unit/merge.test.js tests/unit/pull.test.js tests/unit/task-editor.test.js`
Exit code: 1

```text
 FAIL  tests/unit/backup.test.js > exportBackup > exports a recurring task to format 1 and imports it back with its recurring rules intact
 FAIL  tests/unit/merge.test.js > disconnecting > keeps own lists and tasks and removes the rest
 FAIL  tests/unit/merge.test.js > disconnecting > gives kept tasks local events that reproduce a status set on another device
 FAIL  tests/unit/merge.test.js > disconnecting > replaces local events that fold to another status than the pulled occurrence
 FAIL  tests/unit/occurrences.test.js > rules > keeps the due time and overdue handling of a recurring task empty
 FAIL  tests/unit/pull.test.js > disconnecting > keeps a status set on another device through a disconnect and the next adoption (CON-8, CON-4)
 FAIL  tests/unit/push.test.js > handling replies > restores the occurrence when the service refuses every queued tick
 FAIL  tests/unit/queue.test.js > queued events and rule edits > restores the original occurrence when every queued event is rolled back in turn (SYN-9)
 FAIL  tests/unit/queue.test.js > queued events and rule edits > restores the rules and occurrence when a rule edit and the event after it are both rolled back
 FAIL  tests/unit/store-db.test.js > the version 5 migration > keeps the undo data of migrated rule edits and events, so a refused one rolls back
 FAIL  tests/unit/store-tasks.test.js > createTask > creates a recurring task without due time or overdue handling, as the service requires
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor by role (SHR-4, SHR-5) > offers Edit and Delete on synced own notes only, and names the authors of other notes (NOT-2, NOT-4)
 Test Files  9 failed (9)
      Tests  12 failed | 222 passed (234)
```

### Green: lint, service worker check, and unit suite
Commands: `npx eslint .` (exit code 0, no output), `npm run check:sw` (exit code 0), and `npm test` (exit code 0)

```text
OK: 125 precached files match VERSION 2026-11-15.2.
 Test Files  56 passed (56)
      Tests  1232 passed (1232)
```

### Green: contract suite against a local todos.server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0224/todos-server npm run test:contract`
Exit code: 0

```text
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

`processes list --cwd node_modules/.cache/t0224/todos-server` printed `(empty)` after the run.

### Green: e2e suite
Command: `npm run test:e2e -- --reporter=line`
Exit code: 0

```text
[200/201] [chromium] › tests\e2e\task-editor.spec.js:181:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5)
[201/201] [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6)
  201 passed (2.0m)
```

## Round 3: after the merge of main
`git fetch origin` showed `main` and `origin/main` at `4e687d7`, already merged into the branch, so no new merge was needed.
The merge left a stale precache hash for `js/views/task-list.js`, so `npm run check:sw` failed on HEAD `afc6543`:

```text
ERROR: precached files changed but VERSION is still 2026-11-15.4:
  js/views/task-list.js
Bump VERSION in service-worker.js, then run: node scripts/check-sw-version.mjs --update
```

The service worker `VERSION` became `2026-11-15.5`, followed by `node scripts/check-sw-version.mjs --update`.

### Green: lint, service worker check, and unit suite
Commands: `npx eslint .` (exit code 0, no output), `npm run check:sw` (exit code 0), and `npm test` (exit code 0)

```text
OK: 126 precached files match VERSION 2026-11-15.5.
 Test Files  57 passed (57)
      Tests  1283 passed (1283)
```

### Green: contract suite against a local todos.server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0224/todos-server npm run test:contract`
Exit code: 0

```text
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

### Green: e2e suite
Command: `npm run test:e2e -- --reporter=line`
Exit code: 0

```text
[204/205] [chromium] › tests\e2e\task-editor.spec.js:181:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5)
[205/205] [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6)
  205 passed (2.3m)
```
