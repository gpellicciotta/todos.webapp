## Walkthrough & Validation

Failing run before the implementation (new unit tests, `npx vitest run tests/unit/bin.test.js tests/unit/push.test.js`), exit code 1:

```
 ❯ tests/unit/bin.test.js (34 tests | 5 failed)
 ❯ tests/unit/push.test.js (25 tests | 5 failed)
 Test Files  2 failed (2)
      Tests  10 failed | 49 passed (59)
```

After the implementation, `npx vitest run`, exit code 0:

```
 Test Files  61 passed (61)
      Tests  1527 passed (1527)
```

`npx playwright test tests/e2e/sync.spec.js tests/e2e/bin-settings.spec.js`, exit code 0:

```
  16 passed (17.2s)
```

`npx eslint .`, exit code 0, no output.

Contract suite: `TODOS_SERVER_DIR=C:/Dev-Projects/todos.server npm run test:contract`, exit code 1.
The built jar in that checkout dates from 2026-11-15, before todos.server T0257 (2026-11-16), so it lacks the purge routes.
Result: 17 passed, 3 failed (the three new purge tests). Rebuilding the jar needs GitHub Packages credentials and writes to the sibling repository, so it was not done.
The new contract tests are unverified against a T0257 server.

## Review round 1 rework

Reviewer findings B1 (dropped entries of a row whose create may have reached the service) and B2 (recovery lost on a failing read) are fixed, with unit tests for tasks and lists, lost replies, in-flight creates, and a network failure, a 503, and a 401 on the recovery read.
The contract run also showed that a client `before` time misses entries: the service stamps deletion with its receive time. The app now sends `DELETE /api/recycle-bin` without `before`.

Contract suite, run against a todos.server install whose `todos-server.jar` is the build of 2026-11-16 11:54, after the T0257 commit (copied from `output/server/libs` into a scratch install; the sibling repository was only read).
`TODOS_SERVER_DIR=<scratch install> npm run test:contract`, exit code 0:

```
 Test Files  1 passed (1)
      Tests  20 passed (20)
```

`npx vitest run`, exit code 0:

```
 Test Files  61 passed (61)
      Tests  1533 passed (1533)
```

`npx eslint .`, exit code 0, no output.
`npx playwright test tests/e2e/sync.spec.js tests/e2e/bin-settings.spec.js`, exit code 0:

```
  16 passed (19.4s)
```

Not established: that todos.server T0257 is deployed to production. The app copes: a server without the routes answers 404, which counts as done, so the purge stays device-only until the service is upgraded.
