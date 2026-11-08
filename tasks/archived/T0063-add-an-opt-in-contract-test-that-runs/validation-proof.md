## Walkthrough & Validation

Key changes:
- `tests/contract/server.js` starts a todos server on `--memory-db` through `devops.py`, with a local Auth stand-in and a temporary environment file.
- `tests/contract/sync.contract.test.js` covers sign-in, adoption, merge, tombstone, `410`, and `426`.
- `exchangeCode` in `src/js/sync/auth.js` now reads the JSON answer of the sign-in callback. The contract run found the old redirect-only read failing against the real server.
- Server defect found: a `--memory-db` server answers `500` to a new note. Recorded as todos task T0207; the note test uses `it.fails` until then.

### Failing first
```text
$ TODOS_SERVER_DIR=C:/Dev-Projects/todos npm run test:contract   (before the fix of src/js/sync/auth.js; excerpt)

 FAIL  tests/contract/sync.contract.test.js > the sync client against a real todos server > answers 426 to a client below the minimum version, and the client stops syncing
AuthError: callback answered 200
 ❯ exchangeCode src/js/sync/auth.js:99:11
     97|   const [opc, email] = [landing.get('opc'), landing.get('email')];
     98|   if (!opc || !email) {
     99|     throw new AuthError('rejected', `callback answered ${callback.stat…
 ❯ Object.complete src/js/sync/session.js:131:39
 ❯ device tests/contract/sync.contract.test.js:83:5

 Test Files  1 failed (1)
      Tests  6 failed (6)
   Start at  21:12:21
   Duration  3.93s (tests 91%, import 3%, transform 5%)
```
```text
$ npx vitest run tests/unit/session.test.js   (new unit test before the fix; excerpt)

 ❯ tests/unit/session.test.js (14 tests | 1 failed) 36ms
     × reads the one-time passcode from the JSON answer of the callback 7ms
AuthError: callback answered 200
 ❯ exchangeCode src/js/sync/auth.js:99:11
 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

### Contract run against the real server
```text
$ TODOS_SERVER_DIR=C:/Dev-Projects/todos npm run test:contract

> todos-webapp@0.2.1-pre test:contract
> vitest run --config vitest.contract.config.js


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0063-add-an-opt-in-contract-test-that-runs


 Test Files  1 passed (1)
      Tests  6 passed | 1 expected fail (7)
   Start at  21:17:26
   Duration  5.05s (tests 96%, import 3%, transform 1%)

exit: 0
```

### Contract run without TODOS_SERVER_DIR
```text
$ npm run test:contract

> todos-webapp@0.2.1-pre test:contract
> vitest run --config vitest.contract.config.js

Contract tests skipped: set TODOS_SERVER_DIR to a todos checkout, such as TODOS_SERVER_DIR=../todos

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0063-add-an-opt-in-contract-test-that-runs


 Test Files  1 skipped (1)
      Tests  7 skipped (7)
   Start at  21:17:32
   Duration  350ms (import 66%, transform 30%, worker 4%)

exit: 0
```

### Server defect behind the expected failure
```text
Server log of the todos checkout during the adoption test (excerpt):

POST /api/tasks/01a1b76f-6b41-77f7-b903-8625f4d665ea/notes -> 500 (19ms)
[ERROR] Processing Error: com.pellicciotta.todos.repository.RepositoryException: There is no user with ID '1' to be the author
```

### Unit tests
```text
$ npm test

> todos-webapp@0.2.1-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0063-add-an-opt-in-contract-test-that-runs


 Test Files  51 passed (51)
      Tests  1020 passed (1020)
   Start at  21:17:34
   Duration  10.58s (environment 61%, tests 27%, import 10%, transform 2%, worker 2%)


exit: 0
```

### Lint and service worker check
```text
$ npm run lint

> todos-webapp@0.2.1-pre lint
> eslint .

exit: 0
$ npm run check:sw

> todos-webapp@0.2.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 68 precached files match VERSION 2026-11-07.22.
exit: 0
```
