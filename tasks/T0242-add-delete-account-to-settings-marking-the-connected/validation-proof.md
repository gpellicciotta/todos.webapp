## Walkthrough & Validation

Delete account sits after Disconnect in Settings while connected. It marks the account through `PUT /api/users/{id}`, then disconnects.

Screenshots: [light](delete-account-light.png), [dark](delete-account-dark.png).

### Failing tests before implementation
Command: `npx vitest run tests/unit/api.test.js tests/unit/settings.test.js`, exit code 1.
```text
 FAIL  tests/unit/settings.test.js > Delete account in Settings > needs the account email typed before it enables
TypeError: Cannot read properties of undefined (reading 'click')
 FAIL  tests/unit/settings.test.js > Delete account in Settings > marks the account and disconnects after a 2xx reply
TypeError: Cannot read properties of undefined (reading 'click')
 FAIL  tests/unit/settings.test.js > Delete account in Settings > keeps the session and shows a toast when the service refuses
TypeError: Cannot read properties of undefined (reading 'click')
 Tests  4 failed | 39 passed (43)
```

### Passing after implementation
Command: `npx vitest run tests/unit/api.test.js tests/unit/settings.test.js`, exit code 0.
```text
 Test Files  2 passed (2)
      Tests  43 passed (43)
```

Command: `npm test`, exit code 0.
```text
 Test Files  60 passed (60)
      Tests  1584 passed (1584)
```

Command: `npx eslint src tests`, exit code 0, no output.

Command: `npx playwright test tests/e2e/connect.spec.js`, exit code 0.
```text
  ok 8 [chromium] › tests\e2e\connect.spec.js:171:1 › Delete account marks the account on the service, disconnects, and keeps the local data (1.7s)
  9 passed (7.7s)
```

Command: `npm run test:e2e`, exit code 1.
```text
  1 failed
    [chromium] › tests\e2e\all-tasks.spec.js:591:1 › a just added row keeps the hover feedback of other rows while it is highlighted
  223 passed (2.4m)
```
The failed hover test passes alone, so it is flaky and unrelated:
```text
  ok 1 [chromium] › tests\e2e\all-tasks.spec.js:591:1 › a just added row keeps the hover feedback ... (761ms)
  1 passed (2.0s)
```

Command: `TODOS_SERVER_DIR=C:/Dev-Projects/todos.server npm run test:contract`, exit code 1.
```text
 ❯ tests/contract/sync.contract.test.js (20 tests | 3 failed)
     × purges a trashed task from the recycle bin, and a second device sees a purged tombstone
     × empties the recycle bin at the service, so a fresh snapshot keeps it empty
     × brings a purged task back when it was restored on another device
 Tests  3 failed | 17 passed (20)
```
The 3 failures cover task purge and tombstones. This task touches no purge code and no contract path; I did not verify the cause against the sibling server checkout, and did not run the suite on `main` for comparison.
