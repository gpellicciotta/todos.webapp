## Technical Specifications

### Prerequisites
- T0026 done: the sync client can upload, download, and adopt.
- A todos checkout, named by `TODOS_SERVER_DIR`, with Java and Python for its `devops.py`.

### Decisions
- **[Decided]** The suite is opt-in: without `TODOS_SERVER_DIR` it skips with one visible message; `npm test` and Pages CI never run it.
- **[Decided]** It starts the server with `python {{todos}}/scripts/devops.py server start --memory-db --background` on a free port, and stops it afterward.
- **[Decided]** It runs in Vitest with real `fetch` against the local server, with no browser, using the sync modules directly on `fake-indexeddb`.
- To confirm in the Read step: how the test obtains a bearer token for a test account without the external Auth service.
  Use the route or setting the todos verification already uses; if none exists, record a backend task with `plan tasks create --project`.

### Declared Files
- tests/contract/sync.contract.test.js
- tests/contract/server.js
- vitest.contract.config.js
- package.json
- docs/devops.md

Size estimate: 5 files, 300 lines

### Tests
- Unit: the server helper builds the start and stop commands from `TODOS_SERVER_DIR` and skips cleanly when it is unset.
- Integration: first connect uploads local lists, tasks, and notes, merges a list into a same-named account list, and repeats without duplicates.
- Integration: two clients edit different fields and the same field of one task; both converge, and the loser gets a sync log entry from `conflicts`.
- Integration: a purged row arrives as a tombstone; a cursor below the floor returns `410` and triggers a new snapshot.
- Integration: a client below `sync.min-client-versions` gets `426` and stops syncing with "update required".

Completion check: `TODOS_SERVER_DIR=../todos npm run test:contract`
