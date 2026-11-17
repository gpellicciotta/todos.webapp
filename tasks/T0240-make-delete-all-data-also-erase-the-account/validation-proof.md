## Walkthrough & Validation

### Failing tests before the implementation
Command: `npx vitest run tests/unit/bin.test.js tests/unit/push.test.js tests/unit/engine.test.js tests/unit/settings.test.js` (exit code 1)

```text
 ❯ tests/unit/bin.test.js (47 tests | 1 failed) 238ms
     × drops the earlier entries and queues one erase entry with the time while tracking 15ms
 ❯ tests/unit/push.test.js (36 tests | 4 failed) 485ms
     × sends the erase route with before, then logs the counts as one record 15ms
     × keeps the entry and pauses on 401 5ms
     × keeps the entry while offline 3ms
     × drops the entry, logs an error, and reports the refusal on another 4xx 7ms
 ❯ tests/unit/engine.test.js (13 tests | 1 failed) 620ms
     × does not pull while the erase waits, and pulls right after it succeeds 13ms
 ❯ tests/unit/settings.test.js (40 tests | 2 failed) 811ms
     × is enabled while connected, with no Disconnect first hint 12ms
     × says what leaves the account when connected, and counts only what the user owns 15ms
 Test Files  4 failed (4)
      Tests  8 failed | 128 passed (136)
```

### Unit suite after the implementation
Command: `npx vitest run` (exit code 0)

```text
 Test Files  60 passed (60)
      Tests  1593 passed (1593)
```

Command: `npm run lint` (exit code 0, no findings). Command: `node scripts/check-sw-version.mjs` (exit code 0)

```text
OK: 129 precached files match VERSION 2026-11-17.12.
```

### E2E suite
Command: `npx playwright test` (exit code 0)

```text
  225 passed (2.4m)
```

### Contract suite
Command: `TODOS_SERVER_DIR=C:/Dev-Projects/todos.server npm run test:contract` (exit code 1)

```text
 ❯ tests/contract/sync.contract.test.js (21 tests | 4 failed) 4764ms
     × purges a trashed task from the recycle bin, and a second device sees a purged tombstone 201ms
     × empties the recycle bin at the service, so a fresh snapshot keeps it empty 173ms
     × erases the account data from a queued erase, so another device gets tombstones 173ms
     × brings a purged task back when it was restored on another device 189ms
 Test Files  1 failed (1)
      Tests  4 failed | 17 passed (21)
```

**Not verified against a real server.** The server jar at `todos.server/output/server/install/todos/todos-server.jar` is dated 2026-11-15, before the erase route (server v4.1.0, 2026-11-16) and the recycle-bin purge routes existed.
The three recycle-bin tests, which passed before this task's route work was needed, fail for the same reason: the jar is stale.
Rebuilding writes to a sibling repository, which needs user confirmation. The new erase contract test stays unproven until the jar is rebuilt.

### Visual
- Connected button: [light](after-button-light.png), [dark](after-button-dark.png)
- Connected dialog: [light](after-dialog-light.png), [dark](after-dialog-dark.png)
