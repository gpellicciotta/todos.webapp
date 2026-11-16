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
- `DELETE /api/recycle-bin?before={{time}}` purges every entry the user may restore, deleted before `time`.

### Queue Entries
Connected or expired, the store queues purges; local mode queues nothing, as today.
- `purgeForever(type, id)` queues `{operation: 'purge', target: {type, id}}`.
- `emptyBin()` queues one `{operation: 'empty-bin', time}`.
- T0248's `purgeEntries`, when present, queues one `purge` per entry.
- Earlier entries of a purged row stay and push first, so a queued trash reaches the service before its purge.
- A row whose `create` is still queued never reached the service: its entries are dropped and no purge is queued.

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
- Unit: a purge of a row with a queued `create` drops its entries and queues no purge.
- Unit: push sends the purge routes, with `before` for `empty-bin`, and treats `404` as done.
- Unit: a `409` reads the row back, restores it locally, and logs it.
- Integration: the contract suite trashes a task, purges it, and sees a `purged` tombstone in the feed of a second session.
- Integration: the sync e2e spec empties the bin while connected; after a fresh snapshot the bin stays empty.

Completion check: `npm test`, the sync and bin-settings e2e specs, and `npm run test:contract` pass.
