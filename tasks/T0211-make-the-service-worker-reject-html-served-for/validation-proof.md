## Walkthrough & Validation

```text
$ npm test
 Test Files  59 passed (59)
      Tests  1184 passed (1184)
$ npm run lint  (exit 0)
exit 0
$ npm run check:sw
OK: 75 precached files match VERSION 2026-11-08.12.
$ npx playwright test tests/e2e/service-worker.spec.js

  3 passed (7.1s)
```
