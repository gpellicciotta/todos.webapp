## Walkthrough & Validation

### Red phase: tests before the helpers exist
Command: `npx vitest run tests/unit/list-find.test.js tests/unit/list-sort.test.js tests/unit/list-counts.test.js`
Exit code: 1

```text
 FAIL  tests/unit/list-find.test.js [ tests/unit/list-find.test.js ]
Error: Cannot find module '../../src/js/core/list-find.js' imported from tests/unit/list-find.test.js
 FAIL  tests/unit/list-sort.test.js [ tests/unit/list-sort.test.js ]
Error: Cannot find module '../../src/js/core/list-sort.js' imported from tests/unit/list-sort.test.js
 FAIL  tests/unit/list-counts.test.js [ tests/unit/list-counts.test.js ]
Error: Cannot find module '../../src/js/core/list-counts.js' imported from tests/unit/list-counts.test.js

 Test Files  3 failed (3)
      Tests  no tests
```

### Green phase: new tests
Command: `npx vitest run tests/unit/list-find.test.js tests/unit/list-sort.test.js tests/unit/list-counts.test.js`
Exit code: 0

```text
 Test Files  3 passed (3)
      Tests  29 passed (29)
```

### Green phase: full suite
Command: `npm test`
Exit code: 0

```text
 Test Files  58 passed (58)
      Tests  1163 passed (1163)
   Duration  10.99s (environment 60%, tests 28%, import 9%, transform 1%, worker 1%)
```

### Lint and service worker version
Command: `npm run lint`
Exit code: 0

```text

> todos-webapp@0.2.1-pre lint
> eslint .

```

Command: `npm run check:sw`
Exit code: 0

```text
> node scripts/check-sw-version.mjs

OK: 75 precached files match VERSION 2026-11-08.3.
```
