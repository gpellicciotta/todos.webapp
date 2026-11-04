## Walkthrough & Validation

### Red Phase
The tests ran before app-components.css, the icon sprite, and the app gallery sections existed.
Output blocks drop ANSI codes and trailing spaces only.

Command: `npx vitest run tests/unit/tokens.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/tokens.test.js (113 tests | 2 failed) 78ms
   ❯ stylesheets outside tokens.css (3)
     × include style.css, fonts.css, controls.css, app-components.css, and the gallery stylesheet 13ms
     × are imported by style.css in order: fonts, tokens, controls, then app components 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tokens.test.js > stylesheets outside tokens.css > include style.css, fonts.css, controls.css, app-components.css, and the gallery stylesheet
AssertionError: expected [ 'controls.css', 'fonts.css', …(2) ] to deeply equal ArrayContaining{…}

- Expected
+ Received

- ArrayContaining [
-   "style.css",
-   "fonts.css",
+ [
[... 39 lines omitted ...]


 Test Files  1 failed (1)
      Tests  2 failed | 111 passed (113)
   Start at  15:50:34
   Duration  337ms (tests 53%, transform 24%, import 18%, worker 5%)
```

All 17 new end-to-end tests failed, each on its missing sections or specimens.

Command: `E2E_PORT=8791 npx playwright test tests/e2e/gallery-app.spec.js` (exit code 1)

```text

Running 17 tests using 4 workers

  x   3 [chromium] › tests\e2e\gallery-app.spec.js:112:3 › task rows keep one line at 48 px and truncate long text at 390 px (951ms)
  x   1 [chromium] › tests\e2e\gallery-app.spec.js:89:5 › app sections render at 1440 px in the light theme (6.1s)
  x   2 [chromium] › tests\e2e\gallery-app.spec.js:89:5 › app sections render at 390 px in the dark theme (6.1s)
  x   4 [chromium] › tests\e2e\gallery-app.spec.js:89:5 › app sections render at 390 px in the light theme (6.2s)
  x   5 [chromium] › tests\e2e\gallery-app.spec.js:89:5 › app sections render at 1440 px in the dark theme (5.8s)
  x   6 [chromium] › tests\e2e\gallery-app.spec.js:112:3 › task rows keep one line at 48 px and truncate long text at 1440 px (1.0s)
  x   7 [chromium] › tests\e2e\gallery-app.spec.js:146:3 › completed rows are muted, and cancelled rows are muted and struck through, in the light theme (1.1s)
  x   8 [chromium] › tests\e2e\gallery-app.spec.js:146:3 › completed rows are muted, and cancelled rows are muted and struck through, in the dark theme (1.0s)
  x   9 [chromium] › tests\e2e\gallery-app.spec.js:173:1 › every status and sync state has its own icon from the sprite (1.3s)
  x  12 [chromium] › tests\e2e\gallery-app.spec.js:229:3 › interactive app specimens are at least 44 by 44 px at 390 px (884ms)
  x  13 [chromium] › tests\e2e\gallery-app.spec.js:256:3 › every keyboard stop in the app sections shows a focus ring at 390 px (837ms)
  x  14 [chromium] › tests\e2e\gallery-app.spec.js:229:3 › interactive app specimens are at least 44 by 44 px at 1440 px (738ms)
  x  15 [chromium] › tests\e2e\gallery-app.spec.js:256:3 › every keyboard stop in the app sections shows a focus ring at 1440 px (908ms)
  x  16 [chromium] › tests\e2e\gallery-app.spec.js:293:1 › every app component section shows a forced focus-visible specimen with a focus ring (874ms)
  x  11 [chromium] › tests\e2e\gallery-app.spec.js:211:1 › navigation marks the current route with aria-current in the sidebar and the bottom bar (6.0s)
  x  17 [chromium] › tests\e2e\gallery-app.spec.js:310:1 › task row specimens cover every documented state (5.7s)
  x  10 [chromium] › tests\e2e\gallery-app.spec.js:202:1 › the syncing icon spins only without reduced motion (30.1s)


  1) [chromium] › tests\e2e\gallery-app.spec.js:89:5 › app sections render at 390 px in the light theme

    Error: Status button

    expect(locator).toHaveCount(expected) failed

    Locator:  locator('[data-gallery-group="app"], [data-gallery-group="patterns"]').filter({ has: getByRole('heading', { name: 'Status button', exact: true, level: 2 }) })
    Expected: 1
    Received: 0
    Timeout:  5000ms

    Call log:
      - Status button locator('[data-gallery-group="app"], [data-gallery-group="patterns"]').filter({ has: getByRole('heading', { name: 'Status button', exact: true, level: 2 }) }) with timeout 5000ms
      - waiting for locator('[data-gallery-group="app"], [data-gallery-group="patterns"]').filter({ has: getByRole('heading', { name: 'Status button', exact: true, level: 2 }) })
[... 516 lines omitted ...]
```

### Green Phase
The completion check passed; `E2E_PORT` only moves the test server off the shared default port.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  15 passed (15)
      Tests  434 passed (434)
   Start at  16:04:53
   Duration  2.37s (environment 54%, tests 24%, import 18%, transform 3%, worker 2%)

    Isolate  15 workers spawned · ~582ms startup each (spawn + environment, per file)
             at least ~666ms faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `E2E_PORT=8791 npm run test:e2e` (exit code 0)

```text

> todos-webapp@0.1.0-pre test:e2e
> playwright test


Running 35 tests using 4 workers
[... 8 lines omitted ...]
  ok  8 [chromium] › tests\e2e\gallery-app.spec.js:146:3 › completed rows are muted, and cancelled rows are muted and struck through, in the dark theme (1.4s)
  ok 10 [chromium] › tests\e2e\gallery-app.spec.js:202:1 › the syncing icon spins only without reduced motion (997ms)
  ok 12 [chromium] › tests\e2e\gallery-app.spec.js:229:3 › interactive app specimens are at least 44 by 44 px at 390 px (773ms)
  ok 11 [chromium] › tests\e2e\gallery-app.spec.js:211:1 › navigation marks the current route with aria-current in the sidebar and the bottom bar (1.1s)
  ok  9 [chromium] › tests\e2e\gallery-app.spec.js:173:1 › every status and sync state has its own icon from the sprite (1.5s)
  ok 14 [chromium] › tests\e2e\gallery-app.spec.js:229:3 › interactive app specimens are at least 44 by 44 px at 1440 px (781ms)
  ok 16 [chromium] › tests\e2e\gallery-app.spec.js:293:1 › every app component section shows a forced focus-visible specimen with a focus ring (804ms)
  ok 17 [chromium] › tests\e2e\gallery-app.spec.js:310:1 › task row specimens cover every documented state (1.3s)
  ok 18 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the light theme (1.8s)
  ok 20 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 390 px (947ms)
  ok 19 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the dark theme (2.1s)
  ok 22 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the light theme (2.1s)
  ok 13 [chromium] › tests\e2e\gallery-app.spec.js:256:3 › every keyboard stop in the app sections shows a focus ring at 390 px (7.5s)
  ok 24 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 1440 px (1.1s)
  ok 23 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the dark theme (2.6s)
  ok 26 [chromium] › tests\e2e\gallery-controls.spec.js:159:1 › every control section shows a forced focus-visible specimen with a focus ring (1.1s)
  ok 27 [chromium] › tests\e2e\gallery-controls.spec.js:175:1 › checkbox, radio, segmented, and menu specimens include a focus-visible state (1.5s)
  ok 15 [chromium] › tests\e2e\gallery-app.spec.js:256:3 › every keyboard stop in the app sections shows a focus ring at 1440 px (11.6s)
  ok 29 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme (2.0s)
  ok 28 [chromium] › tests\e2e\gallery-controls.spec.js:187:1 › pressed toggles keep distinct hover and active feedback (2.3s)
  ok 30 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the dark theme (2.1s)
  ok 31 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the light theme (2.0s)
  ok 32 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the dark theme (1.9s)
  ok 33 [chromium] › tests\e2e\gallery.spec.js:106:1 › gallery follows the system theme when System is selected (1.7s)
  ok 21 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (14.2s)
  ok 34 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (455ms)
  ok 35 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (445ms)
  ok 25 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (15.1s)

  35 passed (30.2s)
```

### Visual Check
Full-page gallery captures, with motion enabled; section crops were also inspected at both widths and themes.
Fixes made after inspection: shrinking row buttons, hidden chips on hovered rows, and an overflowing due row.

| Width   | Theme | Before                                                                     | After                                                                    |
| :------ | :---- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| 390 px  | light | [gallery-390-light-before.png](screenshots/gallery-390-light-before.png)   | [gallery-390-light-after.png](screenshots/gallery-390-light-after.png)   |
| 390 px  | dark  | [gallery-390-dark-before.png](screenshots/gallery-390-dark-before.png)     | [gallery-390-dark-after.png](screenshots/gallery-390-dark-after.png)     |
| 1440 px | light | [gallery-1440-light-before.png](screenshots/gallery-1440-light-before.png) | [gallery-1440-light-after.png](screenshots/gallery-1440-light-after.png) |
| 1440 px | dark  | [gallery-1440-dark-before.png](screenshots/gallery-1440-dark-before.png)   | [gallery-1440-dark-after.png](screenshots/gallery-1440-dark-after.png)   |
