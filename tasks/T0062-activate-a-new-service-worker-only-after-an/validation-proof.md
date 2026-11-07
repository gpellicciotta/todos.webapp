## Walkthrough & Validation

### Red phase: tests written before the implementation

$ npx vitest run tests/unit/service-worker.test.js tests/unit/sw-update.test.js tests/unit/toast.test.js tests/unit/store-db.test.js
Exit code: 1

```text
      Tests  8 failed | 40 passed (48)
 FAIL  tests/unit/service-worker.test.js > service worker update protocol > calls skipWaiting on the skip-waiting message
 FAIL  tests/unit/service-worker.test.js > service worker update protocol > ignores the message "skip-waiting"
 FAIL  tests/unit/service-worker.test.js > service worker update protocol > ignores the message {"type":"other"}
 FAIL  tests/unit/service-worker.test.js > service worker update protocol > ignores the message null
 FAIL  tests/unit/service-worker.test.js > service worker update protocol > ignores the message undefined
 FAIL  tests/unit/service-worker.test.js > service worker update protocol > precaches on install and waits, without calling skipWaiting
 FAIL  tests/unit/store-db.test.js > openStore connection handling > fails with a blocked StoreError while an older connection stays open
 FAIL  tests/unit/sw-update.test.js [ tests/unit/sw-update.test.js ]
 FAIL  tests/unit/toast.test.js > createToaster > keeps a persistent toast past the expiry time until it is dismissed
 Test Files  4 failed (4)
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
```

$ npx playwright test tests/e2e/service-worker.spec.js
Exit code: 1

```text
  ✓  1 [chromium] › tests\e2e\service-worker.spec.js:10:1 › offline, a navigation to /admin is not answered with the app shell (1.1s)
  ✘  2 [chromium] › tests\e2e\service-worker.spec.js:71:1 › a new version waits for Update, keeps the page on version A, then runs version B (6.8s)
  ✘  3 [chromium] › tests\e2e\service-worker.spec.js:95:1 › a second tab open during the update shows the reload banner (30.1s)
    Error: expect(locator).toBeVisible() failed
    Error: element(s) not found
    Error: locator.click: Test timeout of 30000ms exceeded.
  2 failed
  1 passed (32.0s)
```

### Green phase: after the implementation

Commands and exit codes are in the output below; every exit code is 0.

```text
$ npm test
 Test Files  42 passed (42)
      Tests  932 passed (932)
exit 0
$ npm run lint
> todos-webapp@0.2.1-pre lint
> eslint .
exit 0
$ npm run check:sw
> node scripts/check-sw-version.mjs
OK: 60 precached files match VERSION 2026-11-07.16.
exit 0
$ npx playwright test tests/e2e/service-worker.spec.js tests/e2e/pwa.spec.js
Running 5 tests using 4 workers
  ✓  1 [chromium] › tests\e2e\pwa.spec.js:53:1 › the manifest is served with its type and makes the app installable (1.2s)
  ✓  2 [chromium] › tests\e2e\service-worker.spec.js:10:1 › offline, a navigation to /admin is not answered with the app shell (1.6s)
  ✓  4 [chromium] › tests\e2e\pwa.spec.js:35:1 › after one online visit the app reloads and navigates offline (1.9s)
  ✓  3 [chromium] › tests\e2e\service-worker.spec.js:71:1 › a new version waits for Update, keeps the page on version A, then runs version B (6.0s)
  ✓  5 [chromium] › tests\e2e\service-worker.spec.js:95:1 › a second tab open during the update shows the reload banner (5.6s)
  5 passed (10.0s)
exit 0
```

$ npx playwright test
Exit code: 0

```text
[... 168 lines omitted ...]
  171 passed (1.9m)
```

### Visual verification
The old build activated silently, so the before shots show the same page with no update pending.
Console and network: pwa.spec.js watches both and passed; the shots came from a clean run.

- 390 px light: [before](before-390-light.png), [after](after-390-light.png)
- 390 px dark: [before](before-390-dark.png), [after](after-390-dark.png)
- 1440 px light: [before](before-1440-light.png), [after](after-1440-light.png)
- 1440 px dark: [before](before-1440-dark.png), [after](after-1440-dark.png)

### Size notes
- Undeclared files touched: src/js/ui/sw-update.js (new, testable helper), src/js/ui/toast.js (persistent option), src/index.html (modulepreload), scripts/sw-precache-hashes.json (mechanical: `node scripts/check-sw-version.mjs --update`), tests/unit/sw-update.test.js, tests/unit/toast.test.js, tests/unit/store-db.test.js, docs/specs/visual-style-guide.md, docs/specs/local-store.md, CHANGELOG.md.
- Declared but untouched: src/js/strings.js (does not exist; strings stay in app.js MESSAGES), src/css/app-components.css (the existing toast styles suffice), docs/specs/ui-design.md (already described the behavior).
