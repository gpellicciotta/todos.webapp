## Technical Specifications

### Prerequisites
- T0025 done: the change queue and the adoption rules exist.
- The todos sync spec, Import While Connected, and `BAK-6` of the requirements.

### Rules From the Sync Spec
- Per row, keep the version with the later `last-update-time`; the client decides before it sends anything.
- A newer imported row sends all its fields without an edit time, so the import time is the edit time and the whole row wins.
- An older row sends nothing.
- Imported notes create only missing notes; imported memberships only add; an import never removes.
- An import never changes lists owned by other users or their tasks.

### Open Decision
- Overwrite mode replaces local data. While connected it cannot remove server data, so decide: disable it, make it local-only with a warning, or send the removals as deletes.

### Declared Files
- src/js/views/import-dialog.js
- src/js/core/backup.js
- src/js/sync/queue.js
- tests/unit/import-dialog.test.js
- tests/unit/backup.test.js
- tests/e2e/backup.spec.js

Size estimate: 6 files, 300 lines

### Tests
- Unit: a merge import queues all fields of a newer row, nothing for an older row, and only missing notes.
- Unit: an import never queues a removal and never touches a list of another owner.
- Integration: connected end-to-end, import a backup, see Syncing, then Synced, with the queue drained.

Completion check: `npm test` and `npx playwright test tests/e2e/backup.spec.js`
