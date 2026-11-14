## Walkthrough & Validation

Screenshot (dark theme, 390 px wide): ![Delete all data dialog](delete-all-dialog.png)

```text
$ npm test
 Test Files  59 passed (59)
      Tests  1203 passed (1203)
$ npm run lint
exit 0
$ npm run check:sw
OK: 75 precached files match VERSION 2026-11-08.14.
$ npx playwright test tests/e2e/bin-settings.spec.js

  7 passed (5.8s)
```
