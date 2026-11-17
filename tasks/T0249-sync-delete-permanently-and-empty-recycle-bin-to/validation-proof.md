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
