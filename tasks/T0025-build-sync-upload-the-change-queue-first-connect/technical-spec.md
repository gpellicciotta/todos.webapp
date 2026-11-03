## Technical Specifications

### Prerequisites Outside This Project
- todos tasks T0136 to T0140: the sync protocol, change feed, revisions, and the JavaScript client changes.
- todos task T0149: per-field merge by edit time and first-connect list merging by name.
- todos task T0147: the notes resource, so notes can upload.

### Declared Files
- src/js/sync/queue.js
- src/js/sync/push.js
- src/js/sync/adopt.js
- src/js/sync/api.js
- tests/unit/queue.test.js
- tests/unit/push.test.js
- tests/unit/adopt.test.js

Size estimate: 7 files, 600 lines
Size note: queue, upload, and adoption share one ordering and retry contract.

### Tests
- Unit: queued changes survive a reload and upload in their original order.
- Unit: a retried upload after a network failure creates no duplicate list, task, or note.
- Unit: an update request carries only the changed fields.
- Unit: adoption merges a local list into an account list with the same name.
- Unit: a 403 or 404 rejection undoes the local change and records a sync log entry.
- Integration: against a mocked REST API, a first connect uploads 5 lists and 34 tasks and reports progress.

Completion check: `npm test && npm run lint`
