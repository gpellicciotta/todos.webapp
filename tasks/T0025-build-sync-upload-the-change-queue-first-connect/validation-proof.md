## Walkthrough & Validation

### Failing tests before implementation (TDD)
Command: `npx vitest run tests/unit/queue.test.js tests/unit/push.test.js tests/unit/adopt.test.js tests/unit/api.test.js tests/unit/store-db.test.js`
Exit code: 1

```text
 FAIL  tests/unit/adopt.test.js [ tests/unit/adopt.test.js ]
Error: Cannot find module '../../src/js/sync/adopt.js' imported from tests/unit/adopt.test.js
 FAIL  tests/unit/api.test.js [ tests/unit/api.test.js ]
Error: Cannot find module '../../src/js/sync/api.js' imported from tests/unit/api.test.js
 FAIL  tests/unit/push.test.js [ tests/unit/push.test.js ]
Error: Cannot find module '../../src/js/sync/push.js' imported from tests/unit/push.test.js
 FAIL  tests/unit/queue.test.js > the change queue > survives a reload and keeps the original order
TypeError: Cannot read properties of undefined (reading 'all')
 FAIL  tests/unit/queue.test.js > the change queue > records only the changed fields of an update, each with its edit time
TypeError: Cannot read properties of undefined (reading 'all')
 FAIL  tests/unit/queue.test.js > the change queue > records nothing in local mode and nothing for a change that changes nothing
TypeError: Cannot read properties of undefined (reading 'count')
 FAIL  tests/unit/queue.test.js > the change queue > records memberships, notes, and recycle bin changes in order
TypeError: Cannot read properties of undefined (reading 'all')
 FAIL  tests/unit/queue.test.js > the change queue > undoes entries on the local data
TypeError: Cannot read properties of undefined (reading 'all')
 FAIL  tests/unit/store-db.test.js > the version 4 migration > keeps all data and adds the sync stores
AssertionError: expected 3 to be 4 // Object.is equality
 Test Files  5 failed (5)
```

### Green run after implementation
Command: `npm test`
Exit code: 0

```text
 RUN  v5.1.0 .../T0025-build-sync-upload-the-change-queue-first-connect
 Test Files  46 passed (46)
      Tests  962 passed (962)
```

Command: `npm run lint`
Exit code: 0

```text
> todos-webapp@0.2.1-pre lint
> eslint .
```

Command: `npm run check:sw`
Exit code: 0

```text
OK: 64 precached files match VERSION 2026-11-07.17.
```

Command: `npx playwright test`
Exit code: 0

```text
  171 passed (1.6m)
```

Notes:
- connect.spec.js and shell.spec.js now answer `GET /api/changes`, since a connected app reads the snapshot for first-connect adoption.
- Purged rows (`purgeForever`, `purgeExpired`) and `applyChanges` queue nothing; T0064 queues backup imports.

### Review round 1 rework
Red phase for the membership order test.
Command: `npx vitest run tests/unit/adopt.test.js`
Exit code: 1

```text
 FAIL  tests/unit/adopt.test.js > adopting local data on first connect > uploads the memberships of a list in its manual order
AssertionError: expected [ …(3) ] to deeply equal [ …(3) ]
      Tests  1 failed | 6 passed (7)
```

Green phase after sorting memberships by list and position.
Command: `npm test`
Exit code: 0

```text
 Test Files  46 passed (46)
      Tests  963 passed (963)
```

Command: `npm run check:sw`
Exit code: 0

```text
OK: 64 precached files match VERSION 2026-11-07.18.
```

Command: `lint-markdown check CHANGELOG.md docs/specs/local-store.md`
Exit code: 0

```text
All 2 markdown files passed linting.
Finished lint-markdown check in 0.0s with status: succeeded
```
