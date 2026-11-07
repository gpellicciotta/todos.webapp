## Technical Specifications

### Prerequisites Outside This Project
- Done in the todos repository: T0136 to T0140, T0147, T0149, and T0189 to T0194 (sync protocol, change feed, tombstones, edit-time merging, notes, minimum client version).
- Rules: the todos business logic spec, Synchronization and Adopting Local Data on First Connect; the REST API spec, Edit Time and Conflict Entry.
- T0062 (this project): controlled service worker updates, so the version 4 store migration cannot meet old code in another tab.

### Decisions
- **[Decided]** The client merges by edit time and never sends `If-Match`; a `412` therefore does not occur, and any `412` counts as a rejection.
- **[Decided]** The local records keep no per-field edit times. Each queue entry carries the edit time of every field it changes, sent as `Edit-Time` or `edit-times`.
  The service holds the merged truth, so a stored record needs only its `revision` from the feed.
- **[Decided]** api.js sends `Client-Version: todos.webapp/{{version}}` on every request, taking `VERSION` from version.js without a `-pre` suffix.
- **[Decided]** A queue entry holds `seq`, the target type and id, the operation, the changed fields only, their edit times, and the creation time.
  Entries replay one request per change, in `seq` order; there is no batch route, and every create is idempotent by id.
- **[Decided]** Replies map to outcomes:
  - 2xx with `conflicts`: applied; the lost fields go to the sync log, and the change is not rejected.
  - 400, 403, 404, 409, 412: rejected; revert locally and log it. A 404 on a delete or remove means the row is gone, so the change is done.
  - 401: pause the queue and report Sign in needed; the queue keeps its entries.
  - 426: stop all syncing and report Update required with the minimum from the `Upgrade` header.
  - Network failure or 5xx: retry the same entry with backoff, keeping the order.
- **[Decided]** One tab syncs: a Web Locks lock named `todos-sync` selects the leader that drains the queue; other tabs read the queue and state through a `BroadcastChannel`.
- **[Decided]** One migration, database version 4, creates all sync stores so T0026 adds none:
  - `sync-queue`: key `seq`, auto-incremented; holds the queue entries.
  - `sync-state`: key `key`; holds the account and server, the feed cursor, the local-to-account list id map, and adoption progress.
  - `sync-log`: key `id`, index `time`; written by T0026.
  Existing stores and data stay unchanged.

### Declared Files
- src/js/sync/queue.js
- src/js/sync/push.js
- src/js/sync/adopt.js
- src/js/sync/api.js
- src/js/store/db.js
- docs/specs/local-store.md
- tests/unit/queue.test.js
- tests/unit/push.test.js
- tests/unit/adopt.test.js
- tests/unit/api.test.js
- tests/unit/store-db.test.js

Size estimate: 11 files, 800 lines
Size note: Above the typical line. Queue, upload, adoption, and the version 4 schema share one ordering and retry contract, and the schema must land with the first writer of its stores.

### Tests
- Unit: queued changes survive a reload and upload in their original order.
- Unit: a retried upload after a network failure creates no duplicate list, task, or note.
- Unit: an update request carries only the changed fields, each with its own edit time.
- Unit: api.js sends `Client-Version` and never `If-Match`.
- Unit: reply handling follows the outcome table: conflicts logged, rejections reverted, 404 on delete done, 401 pauses, 426 stops, 5xx retries in order.
- Unit: adoption merges a local list into an account list with the same name, and renames a list whose name a trashed list holds.
- Unit: the migration from version 3 to 4 keeps all data and adds the three stores.
- Unit: only the lock holder drains the queue; a second tab reads the state.
- Integration: against a mocked REST API, a first connect uploads 5 lists and 34 tasks and reports progress.
- Integration: an interrupted first connect resumes without duplicates.

Completion check: `npm test && npm run lint`

### Follow-Ups From Earlier Reviews
- From T0012: enforce that users edit or delete only their own notes once notes carry authors (`NOT-4`).
