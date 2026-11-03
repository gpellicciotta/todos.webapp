## Technical Specifications

### Prerequisites Outside This Project
- todos tasks T0138 and T0139: the change feed endpoint and revision checks.
- todos task T0149: per-field merge semantics.

### Declared Files
- src/js/sync/pull.js
- src/js/sync/merge.js
- src/js/sync/sync-log.js
- src/js/store/db.js
- tests/unit/merge.test.js
- tests/unit/pull.test.js
- tests/unit/sync-log.test.js

Size estimate: 7 files, 600 lines
Size note: pull, merge, and the sync log share one conflict model.

### Tests
- Unit: edits to different fields of one task both survive a merge.
- Unit: for the same field, the edit with the later edit time wins and the other goes to the sync log.
- Unit: notes never conflict, since each note merges as its own record.
- Unit: losing access removes the list and tasks owned by others, keeping own tasks.
- Unit: sync log entries older than 30 days are purged.
- Integration: against a mocked change feed, two devices' concurrent edits converge to the same data.

Completion check: `npm test && npm run lint`
