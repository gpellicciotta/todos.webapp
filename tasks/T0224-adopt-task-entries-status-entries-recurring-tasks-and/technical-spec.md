## Technical Specifications
Design: [todos.server T0215 design](../../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md), all sections.
Once todos.server T0215 completes, its `docs/specs/` are authoritative for routes, fields, and event rules.
Server dependencies: T0241 (Task shape, events, lifecycle-rules route) and T0221 (recurrence, grace, imports, occurrences route).

### Proposed Split
The full scope is far above the large line, so the `[Decide]` step splits it before work starts:

| Part | Scope                                                                                         | Estimate             |
| ---- | --------------------------------------------------------------------------------------------- | -------------------- |
| A    | Store and sync: new task shape, local occurrences and events, fold, event queue, merge, notes renames, `last-update-time` | 16 files, 1300 lines |
| B    | Task views: event actions, `done/target` counts, target and deadline editing, filters and sorting | 10 files, 800 lines  |
| C    | Recurrence: local periods and roll-over, rule editor, display rule, grace completion, history view | 10 files, 900 lines  |
| D    | Backup format 2: `lifecycle-rules`, `occurrences`, `events`, merge and overwrite rules        | 5 files, 500 lines   |

Order: A, then B and D in parallel, then C.

### Store and Sync (Part A)
- **[Decided]** Local mode runs the server rules locally, since `LOC-2` requires every feature without a server.
  This covers occurrence folding, event preconditions, overdue `expire`, and, in part C, periods and roll-over.
- **[Decided]** Raise `DB_VERSION` to 5 and add `occurrences` and `events` object stores.
  The migration maps each task's status, due time, and overdue handling as the server migration does.
- **[Decided]** Task records embed `lifecycle-rules` and `current-occurrence`, matching the wire shape.
  They drop `status`, `due-time`, `overdue-handling`, and `last-activity-time`.
- **[Decided]** `ready` replaces `todo` in `STATUSES` and every label key.
- **[Decided]** Every task change, including memberships, notes, rules, and events, sets `last-update-time` (`TSK-12`, `NOT-5`).
- **[Decided]** Event actions create UUIDv7 events with the client time as `creation-time`.
  They update the cached current occurrence at once and join the queue while connected (`SYN-1`).
- **[Decided]** The push engine posts queued events to `POST /api/tasks/{{task-id}}/events` in order.
  A `409 Conflict` reverts the local event and logs it like other rejected changes.
- **[Decided]** Rule edits queue as `PATCH /api/tasks/{{task-id}}/lifecycle-rules` with their edit time.
- **[Decided]** The merge replaces the cached rules and current occurrence with the server's, then reapplies queued events.
- **[Decided]** Notes map wire `owner-id` and `last-update-time`; local note records rename their fields to match.
- **[Decided]** Local overdue handling (`OVD-4`, `OVD-5`) writes `expire` events instead of setting the status.

### Task Views (Part B)
- **[Decided]** The task row's status button ticks: `complete` when below target, `uncomplete` when the occurrence is completed.
- **[Decided]** A status menu on the row and in the editor offers `start`, `unstart`, `cancel`, and `reopen` when their preconditions hold.
- **[Decide]** Confirm with the user that the status button ticks, replacing the current status menu on click (`TSK-4`).
- **[Decided]** Rows and the editor show `done/target` when the target is above 1.
- **[Decided]** The editor edits target count, deadline, and overdue handling through the lifecycle rules.
- **[Decided]** Filters, grouping, and sorting read status and due time from `current-occurrence`.
- **[Decided]** The "Last activity" sort becomes "Last update" on `last-update-time` (`LST-12`, `LV-6`, `TV-9`).
- **[Decided]** "Finished today only" (`TV-14`) uses the current occurrence's `close-time`.

### Recurrence (Part C)
- **[Decided]** `src/js/core/periods.js` computes periods for day, week, and month units with an interval and an IANA timezone, using `Intl`.
- **[Decided]** In local mode the app rolls tasks over on start and every minute, beside the overdue timer.
- **[Decided]** While connected, the app never rolls over itself; it applies the display rule until the server does.
  The display rule shows a recurring task past its period end as `ready` with count 0.
- **[Decided]** The editor edits unit, interval, end date, end count, and timezone, defaulting to the browser's zone.
- **[Decided]** During the 24-hour grace period, the row menu offers "Complete for previous period", naming the cached occurrence.
- **[Decided]** A history view lists events and occurrences, read online from the server routes, or from the local stores in local mode.

### Backup Format 2 (Part D)
- **[Decided]** Raise the backup format version to 2 with top-level `lifecycle-rules`, `occurrences`, and `events` arrays.
- **[Decided]** `occurrences` is export-only; import rebuilds occurrences from rules and events.
- **[Decided]** Version 1 backups still import, mapping status, due time, and overdue handling like the store migration.
- **[Decided]** Merge mode (`BAK-6`) compares `last-update-time`; imported events are added by identifier, never removed.
- **[Decided]** While connected, imported events post with `import: true`; the server accepts them from the task owner only.

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
- `src/js/views/task-list.js`
- `src/js/views/task-editor.js`
- `src/js/views/view-controls.js`
- `src/js/views/notes.js`
- `src/js/app.js`
- `src/js/core/periods.js` (new)
- `src/js/core/occurrences.js` (new)
- `src/js/views/task-history.js` (new)
- `tests/unit/store-tasks.test.js`
- `tests/unit/store-notes.test.js`
- `tests/unit/store-db.test.js`
- `tests/unit/query.test.js`
- `tests/unit/overdue.test.js`
- `tests/unit/backup.test.js`
- `tests/unit/queue.test.js`
- `tests/unit/push.test.js`
- `tests/unit/merge.test.js`
- `tests/unit/task-list.test.js`
- `tests/unit/task-editor.test.js`
- `tests/unit/view-controls.test.js`
- `tests/unit/periods.test.js` (new)
- `tests/unit/occurrences.test.js` (new)
- `tests/contract/sync.contract.test.js`
- `tests/e2e/task-editor.spec.js`
- `tests/e2e/list.spec.js`
- `tests/e2e/backup.spec.js`
- `tests/fixtures/backup-v2.json` (new)
- `docs/requirements.md`
- `docs/specs/local-store.md`
- `docs/specs/backup-format.md`
- `docs/specs/ui-design.md`
- `CHANGELOG.md`

### Tests
- Unit: `periods.test.js` covers day, week, and month periods with intervals, ISO weeks, and DST changes in `Europe/Brussels`.
- Unit: `occurrences.test.js` folds events in `creation-time` order, ignores failed preconditions, and closes one-off occurrences.
- Unit: `store-db.test.js` migrates a version 4 database with every status to version 5 occurrences and events.
- Unit: `queue.test.js` and `push.test.js` queue events offline, post them in order, and revert one on `409`.
- Unit: `merge.test.js` replaces cached rules and occurrence and reapplies queued events.
- Unit: `backup.test.js` exports format 2, imports format 1 and 2, and drops imported `occurrences`.
- Integration: `sync.contract.test.js` ticks a target-3 weekly task three times against a local server and sees it completed.
- Integration: `task-editor.spec.js` sets a weekly recurrence in local mode, ticks it, and sees `1/3`.

Size estimate: 39 files, 3500 lines
Size note: Far above the large line; the Proposed Split section divides it into four parts, each to become its own task.
Completion check: `npm test && npm run test:contract && npm run test:e2e`
