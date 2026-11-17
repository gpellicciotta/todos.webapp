## Technical Specifications

### Declared Files
- src/js/store/bin.js
- src/js/sync/queue.js
- src/js/sync/push.js
- src/js/sync/api.js
- tests/unit/bin.test.js
- tests/unit/queue.test.js
- tests/unit/push.test.js
- tests/e2e/sync.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- docs/specs/local-store.md
- New, not counted: a contract test for the purge routes under tests/contract/.

Size estimate: 11 files, 500 lines.
Size note: the queue entries, their push, and the spec change cannot merge apart without a half-synced purge.

### Service Routes (todos.server T0257)
- `DELETE /api/recycle-bin/lists/{{list-id}}` and `DELETE /api/recycle-bin/tasks/{{task-id}}` purge one entry.
- `DELETE /api/recycle-bin` purges every entry the user may restore. The app sends no `before`: the service stamps `deletion-time` with its receive time, so a client time could miss queued trashes. [Decided] after review round 1.

### Queue Entries
Connected or expired, the store queues purges; local mode queues nothing, as today.
- `purgeForever(type, id)` queues `{operation: 'purge', target: {type, id}}`.
- `emptyBin()` queues one `{operation: 'empty-bin', time}`.
- T0248's `purgeEntries`, when present, queues one `purge` per entry.
- Earlier entries of a purged row stay and push first, so a queued trash reaches the service before its purge.
- No entry is dropped: a queued `create` may be uploading or have lost its reply. A purge of a row the service never got answers `404`, which is done. [Decided] after review round 1.

### Push
- 2xx and `404`: done.
- `409 Conflict`: the entry is no longer in the service's bin, so it was restored elsewhere.
  The app reads the row back with `GET`, stores it, and logs "Not deleted: it was restored on another device."
- 401 pauses the queue and offline keeps the entry, as for any entry.
- Other 4xx: the entry is dropped and logged as a sync error.

### Wording
- Remove "while connected it empties this device only" from the Recycle Bin design.
- BIN-4 and BIN-7 say that, while connected, permanent deletes apply to the account on every device.

### Tests
- Unit: connected `purgeForever` and `emptyBin` queue their entries; local mode queues nothing.
- Unit: a purge of a row with a queued, in-flight, or reply-lost `create` keeps its entries and still purges at the service.
- Unit: push sends the purge routes and the empty route, and treats `404` as done; a failing recovery read keeps the purge queued.
- Unit: a `409` reads the row back, restores it locally, and logs it.
- Integration: the contract suite trashes a task, purges it, and sees a `purged` tombstone in the feed of a second session.
- Integration: the sync e2e spec empties the bin while connected; after a fresh snapshot the bin stays empty.

Completion check: `npm test`, the sync and bin-settings e2e specs, and `npm run test:contract` pass.
