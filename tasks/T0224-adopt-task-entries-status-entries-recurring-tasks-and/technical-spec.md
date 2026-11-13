## Technical Specifications
Design: [todos.server T0215 design](../../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md), sections "Data Model", "Statuses", "Events and Status Rules", "REST API", and "Change Feed, Export, and Import".
Once todos.server T0215 completes, its `docs/specs/` are authoritative for routes, fields, and event rules.
Server dependency: todos.server T0241 (Task shape, events route, lifecycle-rules route).

### Split
- **[Decided]** The user approved the split on 2026-11-13:

| Task  | Scope                                                                                     |
| ----- | ----------------------------------------------------------------------------------------- |
| T0224 | Store and sync on the new task shape, local occurrences and events, note renames           |
| T0234 | Task views: tick button, event actions, `done/target` counts, rule editing, filters, sort  |
| T0235 | Recurring tasks: local periods and roll-over, rule editor, grace completion, history       |
| T0236 | Backup format 2 with `lifecycle-rules`, `occurrences`, and `events`                        |

- **[Decided]** Order: T0224 first, then T0234 and T0236, then T0235.

### Store and Sync
- **[Decided]** Local mode runs the server rules locally, since `LOC-2` requires every feature without a server.
  This task covers occurrence folding, event preconditions, and overdue `expire`; T0235 adds periods and roll-over.
- **[Decided]** Raise `DB_VERSION` to 5 and add `occurrences` and `events` object stores.
  The migration maps each task's status, due time, and overdue handling as the server migration does.
- **[Decided]** Task records embed `lifecycle-rules` and `current-occurrence`, matching the wire shape.
  They drop `status`, `due-time`, `overdue-handling`, and `last-activity-time`.
- **[Decided]** `ready` replaces `todo` in `STATUSES` and every label key.
- **[Decided]** Every task change, including memberships, notes, rules, and events, sets `last-update-time` (`TSK-12`, `NOT-5`).
- **[Decided]** Event actions create UUIDv7 events with the client time as `creation-time`.
  They update the cached current occurrence at once and join the queue while connected (`SYN-1`).
- **[Decided]** `src/js/core/occurrences.js` folds an occurrence's events in `creation-time` order, then by `id`.
  It ignores events whose precondition fails at their place, and closes one-off occurrences on completion or cancel.
- **[Decided]** The push engine posts queued events to `POST /api/tasks/{{task-id}}/events` in order.
  A `409 Conflict` reverts the local event and logs it like other rejected changes.
- **[Decided]** Rule edits queue as `PATCH /api/tasks/{{task-id}}/lifecycle-rules` with their edit time.
- **[Decided]** The merge replaces the cached rules and current occurrence with the server's, then reapplies queued events.
- **[Decided]** Notes map wire `owner-id` and `last-update-time`; local note records rename their fields to match.
- **[Decided]** Local overdue handling (`OVD-4`, `OVD-5`) writes `expire` events instead of setting the status.

### Keeping Views and Backups Working
- **[Decided]** The store keeps a status edit API for the current views and maps each edit onto events.
  `completed` posts `complete`, `cancelled` posts `cancel`, and `in-progress` posts `start`.
  Going back posts `uncomplete`, `unstart`, or `reopen`, mirroring the todos.server T0218 mapping.
- **[Decided]** Core and view readers take status and due time from `current-occurrence`, without new UI.
  T0234 replaces the status menu with the tick button and event actions.
- **[Decided]** Backups keep format 1: export maps the new shape back, and import maps format 1 into it.
  T0236 adds format 2.

### Declared Files
- `src/js/store/db.js`
- `src/js/store/tasks.js`
- `src/js/store/notes.js`
- `src/js/store/bin.js`
- `src/js/core/query.js`
- `src/js/core/overdue.js`
- `src/js/core/list-counts.js`
- `src/js/core/backup.js`
- `src/js/sync/queue.js`
- `src/js/sync/push.js`
- `src/js/sync/merge.js`
- `src/js/sync/pull.js`
- `src/js/sync/adopt.js`
- `src/js/sync/api.js`
- `src/js/sync/engine.js`
- `src/js/views/task-list.js`
- `src/js/views/task-editor.js`
- `src/js/views/view-controls.js`
- `src/js/core/occurrences.js` (new)
- `tests/unit/store-tasks.test.js`
- `tests/unit/store-notes.test.js`
- `tests/unit/store-db.test.js`
- `tests/unit/query.test.js`
- `tests/unit/overdue.test.js`
- `tests/unit/backup.test.js`
- `tests/unit/queue.test.js`
- `tests/unit/push.test.js`
- `tests/unit/merge.test.js`
- `tests/unit/occurrences.test.js` (new)
- `tests/contract/sync.contract.test.js`
- `docs/requirements.md`
- `docs/specs/local-store.md`
- `CHANGELOG.md`

### Tests
- Unit: `occurrences.test.js` folds events in `creation-time` order, ignores failed preconditions, and closes one-off occurrences.
- Unit: `store-db.test.js` migrates a version 4 database with every status to version 5 occurrences and events.
- Unit: `store-tasks.test.js` maps each status edit onto events and keeps `last-update-time` moving on note and membership changes.
- Unit: `queue.test.js` and `push.test.js` queue events offline, post them in order, and revert one on `409`.
- Unit: `merge.test.js` replaces cached rules and occurrence, reapplies queued events, and maps note `owner-id`.
- Unit: `backup.test.js` still exports and imports format 1 from the new task shape.
- Integration: `sync.contract.test.js` ticks a target-3 task three times through events against a local server and sees it completed.

Size estimate: 30 files, 1600 lines
Size note: Above the large line because the task shape change breaks every status, due time, and activity reader at once, so store, sync, and readers cannot merge apart; requires human size approval before starting.
Completion check: `npm test && npm run test:contract && npm run test:e2e`
