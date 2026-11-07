## Technical Specifications

### Prerequisites
- T0026 done: the sync client can upload, download, and adopt.
- A todos checkout, named by `TODOS_SERVER_DIR`, with Java and Python for its `devops.py`.

### Decisions
- **[Decided]** The suite is opt-in: without `TODOS_SERVER_DIR` it skips with one visible message; `npm test` and Pages CI never run it.
- **[Decided]** It starts the server with `python {{todos}}/scripts/devops.py server start --memory-db --background` on a free port, and stops it afterward.
- **[Decided]** It runs in Vitest with real `fetch` against the local server, with no browser, using the sync modules directly on `fake-indexeddb`.
- **[Decided]** The server has no test-mode user token route, and the todos verification signs in to the real Auth service.
  The helper runs a local Auth stand-in, which grants two known codes, and the server reaches it through `TODOS_AUTH_BASE_URL`.
  The tests sign in through the real `/api/auth-token` routes with the session code of the app.
- **[Decided]** The helper passes a temporary environment file: stand-in Auth, `TODOS_SYNC_MIN_CLIENT_VERSIONS=todos.webapp=0.1.0`, and `TODOS_THROTTLE_REQUESTS_PER_SECOND=100000`.
- **[Decided]** `410` uses a forged cursor above the newest revision. Only the purge job raises the tombstone floor, and a running server has no route for it.
- **[Decided]** A purge arrives as a `list` tombstone from an admin `DELETE /api/lists/{id}`.
- Backend defect: a `--memory-db` server answers `500` to a new note, since its Auth and ToDo's repositories do not share users.
  Recorded as todos task T0207; the note test uses `it.fails` until then.
- Client drift found: the sign-in callback answers JSON, which `exchangeCode` did not read. Fixed in auth.js with a unit test.

### Declared Files
- tests/contract/sync.contract.test.js
- tests/contract/server.js
- vitest.contract.config.js
- package.json
- docs/devops.md

Undeclared files touched (the contract run found the callback drift; the rest follow from it):
- tests/unit/contract-server.test.js: the unit test of the helper, kept in `npm test`.
- src/js/sync/auth.js and tests/unit/session.test.js: the callback fix and its unit test.
- src/service-worker.js: VERSION bump for the precached auth.js.
- scripts/sw-precache-hashes.json: mechanical, from `node scripts/check-sw-version.mjs --update`.
- CHANGELOG.md.

Size estimate: 5 files, 300 lines
Size note: 10 counted files and about 540 lines, above the typical line but below the large line. The suite, its helper, and the callback drift it found cannot merge apart.

### Tests
- Unit: the server helper builds the start and stop commands from `TODOS_SERVER_DIR` and skips cleanly when it is unset.
- Integration: first connect uploads local lists, tasks, and notes, merges a list into a same-named account list, and repeats without duplicates.
- Integration: two clients edit different fields and the same field of one task; both converge, and the loser gets a sync log entry from `conflicts`.
- Integration: a purged row arrives as a tombstone; a cursor below the floor returns `410` and triggers a new snapshot.
- Integration: a client below `sync.min-client-versions` gets `426` and stops syncing with "update required".

Completion check: `TODOS_SERVER_DIR=../todos npm run test:contract`
