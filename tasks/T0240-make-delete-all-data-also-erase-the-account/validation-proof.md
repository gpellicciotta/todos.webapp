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
Round 1 (stale jar dated 2026-11-15): exit code 1, 17 passed, 4 failed, including the erase test.

Round 2, after the server jar was rebuilt (2026-11-17 10:54). Command: `TODOS_SERVER_DIR=C:/Dev-Projects/todos.server npm run test:contract` (exit code 0)

```text
 Test Files  1 passed (1)
      Tests  21 passed (21)
```

The erase test passes against the real server: account rows disappear and a second device receives the tombstones.

**Production check (2026-11-17), unauthenticated probes of `https://todos.pellicciotta.com`.** No authenticated call was made, since it would erase real data.

```text
GET /api/status                    -> 200, "version": "4.1.1", "build-time": "2026-11-17T08:18:32Z"
DELETE /api/users/0/data           -> 401
DELETE /api/users/0/nonexistent-probe -> 400
```

Production runs v4.1.1, built after v4.1.0 (2026-11-16) added the erase route per the server changelog.
The erase path answers 401, as an authenticated route does, and differs from an unknown path under the same prefix.
This is indirect evidence: it shows the version and a route-level response, not a successful erase. A human may still want to run one real erase on a test account.
### Visual
- Connected button: [light](after-button-light.png), [dark](after-button-dark.png)
- Connected dialog: [light](after-dialog-light.png), [dark](after-dialog-dark.png)
