Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/store/migrate.js
- src/js/store/tasks.js
- src/js/core/occurrences.js
- src/js/sync/queue.js
- src/js/sync/merge.js
- src/js/views/task-list.js
- src/js/views/task-editor.js
- tests/unit/occurrences.test.js
- tests/unit/task-editor.test.js
- tests/unit/task-list.test.js
- tests/unit/task-shape.js

Undeclared files touched during execution:
- src/js/core/backup.js, src/js/core/progress.js, src/js/store/bulk.js, src/js/store/db.js, src/service-worker.js
- docs/specs/local-store.md
- tests/unit/: adopt, backup, merge, overdue, progress, pull, push, queue, recurrence-review, store-db, store-notes,
  store-recurrence, store-tasks test files, and sync-fake-feed.js
- tests/e2e/: all-tasks, backup, list, sharing, store-upgrade, and task-editor specs; tests/contract/sync.contract.test.js
- Added: tests/unit/goal-fields.test.js

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Tests
- Unit: the existing tests pass on records without the legacy fields.
- Integration: the existing end-to-end tests pass unchanged in behavior.

Completion check: `python scripts/devops.py check`
Size estimate: 11 files, 500 lines
Size note: the fields leave every reader at once, or the app breaks.
