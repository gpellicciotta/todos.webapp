## Technical Specifications

### Prerequisites Outside This Project
- Done in the todos repository: T0138 and T0139 (change feed, revision checks), T0149 and T0189 (per-field merge), T0192 and T0193 (changes since a cursor, tombstones).
- Rules: the todos business logic spec, Change Feed, Tombstones, Merging by Edit Time, and Rejected and Failed Changes.
- T0025 (this project): the queue, the replay, and the version 4 store with `sync-queue`, `sync-state`, and `sync-log`.

### Decisions
- **[Decided]** The service owns field merging. A pulled row replaces the local row, except fields that still have a pending queue entry; those keep their local value until the replay answers.
  A replay that loses a field returns `conflicts`; the engine logs the lost value and applies the kept one.
- **[Decided]** Local records store the feed's `revision`. A tombstone or entry applies only when its revision is above the stored one or the row is absent; tombstones apply first.
  Rows never uploaded have no revision and are never replaced by a feed entry.
- **[Decided]** engine.js is the state machine and scheduler. Only the Web Locks leader polls: every 30 seconds while the page is visible, and after going online, gaining focus, or replaying the queue.
  It pages until `has-more` is false, and postpones dropping tasks without a visible membership until the last page.
- **[Decided]** States: `local-only`, `synced`, `syncing`, `offline`, `sign-in-needed`, `error`, `update-required`. T0027 renders them.
- **[Decided]** A `410` keeps the queue, drops the rows that came from the service, keeps never-uploaded rows, and fetches a new snapshot without a message.
  A feed `protocol` other than `1` stops syncing and sets `update-required`.
- **[Decided]** Losing access removes the list and the tasks owned by others, keeps own tasks, and shows the toast "You no longer have access to {{list}}. {{n}} changes were undone."
- **[Decided]** Computed fields are derived locally: `overdue`, `role` of tasks, `task-count`, and `lists` of tasks.
- Disconnecting keeps own lists and tasks, removes the rest, drops the cursor, and calls no route (`CON-8`, `CON-9`).

### Declared Files
- src/js/sync/pull.js
- src/js/sync/merge.js
- src/js/sync/sync-log.js
- src/js/sync/engine.js
- tests/unit/merge.test.js
- tests/unit/pull.test.js
- tests/unit/sync-log.test.js
- tests/unit/engine.test.js

Size estimate: 8 files, 750 lines
Size note: Above the typical line. Pull, merge, the engine, and the sync log share one conflict model and one state machine.

### Tests
- Unit: edits to different fields of one task both survive a merge.
- Unit: a pending queue field keeps its local value over a pulled row; other fields take the pulled value.
- Unit: a replay that loses a field logs the lost and the kept value from `conflicts`.
- Unit: notes never conflict, since each note merges as its own record.
- Unit: entries and tombstones at or below the stored revision are ignored, and tombstones apply first.
- Unit: orphan tasks are dropped only after the last page of a paged feed.
- Unit: losing access removes the list and tasks owned by others, keeping own tasks.
- Unit: a `410` keeps the queue and rebuilds server rows from a snapshot; protocol 2 sets `update-required`.
- Unit: sync log entries older than 30 days are purged.
- Unit: only the leader polls, on a 30-second timer and on online, focus, and replay triggers.
- Integration: against a mocked change feed, two devices' concurrent edits converge to the same data.

Completion check: `npm test && npm run lint`
