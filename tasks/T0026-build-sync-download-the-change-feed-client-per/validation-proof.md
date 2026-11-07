# T0026 Validation Proof

## Red run (tests before implementation)

```
npx vitest run tests/unit/merge.test.js tests/unit/pull.test.js tests/unit/sync-log.test.js tests/unit/engine.test.js
 FAIL  tests/unit/engine.test.js [ tests/unit/engine.test.js ]
Error: Cannot find module '../../src/js/sync/engine.js' imported from tests/unit/engine.test.js
 FAIL  tests/unit/merge.test.js [ tests/unit/merge.test.js ]
Error: Cannot find module '../../src/js/sync/merge.js' imported from tests/unit/merge.test.js
 FAIL  tests/unit/pull.test.js [ tests/unit/pull.test.js ]
Error: Cannot find module '../../src/js/sync/pull.js' imported from tests/unit/pull.test.js
 FAIL  tests/unit/sync-log.test.js [ tests/unit/sync-log.test.js ]
Error: Cannot find module '../../src/js/sync/sync-log.js' imported from tests/unit/sync-log.test.js
 Test Files  4 failed (4)
      Tests  no tests
exit code: 1
```

## Green run (completion check)

```
npm test && npm run lint && npm run check:sw
 Test Files  50 passed (50)
      Tests  1014 passed (1014)
npm test exit: 0
> eslint .


OK: 68 precached files match VERSION 2026-11-07.20.
```

```
npx playwright test tests/e2e/shell.spec.js tests/e2e/network-guard.spec.js tests/e2e/connect.spec.js tests/e2e/service-worker.spec.js
  ✓  30 [chromium] › tests\e2e\shell.spec.js:361:1 › a start-up failure shows an error banner instead of a broken page (588ms)

  30 passed (13.8s)
```
