## Walkthrough & Validation
Before the change, 8 of 16 new unit tests failed (`/admin` and `/api` were handled).

```text
$ npm run check:sw
OK: 54 precached files match VERSION 2026-11-05.2.
$ npm test
 Test Files  35 passed (35)
      Tests  657 passed (657)
$ npm run lint
(no output, exit code 0)
$ npm run test:e2e
  117 passed (1.1m)
```
