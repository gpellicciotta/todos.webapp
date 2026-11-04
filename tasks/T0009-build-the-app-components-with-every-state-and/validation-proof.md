## Walkthrough & Validation
T0009 was split on 2026-11-04; the app chrome and its tests moved to T0031.
Green runs use a T0009-only tree: `git archive HEAD` plus only the T0009 files.
Output blocks drop ANSI codes and trailing spaces only.

### Red Phase
The tests ran before app-components.css, the icon sprite, and the app gallery sections existed.
The end-to-end run predates the split, so it also lists the chrome tests now owned by T0031.

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
All runs below use the T0009-only tree; `E2E_PORT` only moves the test server off the shared port.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/t0009-tree


 Test Files  11 passed (11)
      Tests  384 passed (384)
   Start at  16:12:14
   Duration  1.19s (tests 39%, import 31%, transform 26%, worker 3%)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `E2E_PORT=8792 npx playwright test tests/e2e/gallery-app.spec.js` (exit code 0)

```text

Running 15 tests using 4 workers

  ok  2 [chromium] › tests\e2e\gallery-app.spec.js:79:5 › task row, status, and task list sections render at 1440 px in the light theme (1.2s)
  ok  3 [chromium] › tests\e2e\gallery-app.spec.js:102:3 › task rows keep one line at 48 px and truncate long text at 390 px (1.1s)
  ok  1 [chromium] › tests\e2e\gallery-app.spec.js:79:5 › task row, status, and task list sections render at 390 px in the dark theme (1.2s)
  ok  4 [chromium] › tests\e2e\gallery-app.spec.js:79:5 › task row, status, and task list sections render at 390 px in the light theme (1.3s)
  ok  6 [chromium] › tests\e2e\gallery-app.spec.js:102:3 › task rows keep one line at 48 px and truncate long text at 1440 px (777ms)
  ok  5 [chromium] › tests\e2e\gallery-app.spec.js:79:5 › task row, status, and task list sections render at 1440 px in the dark theme (910ms)
  ok  7 [chromium] › tests\e2e\gallery-app.spec.js:136:3 › completed rows are muted, and cancelled rows are muted and struck through, in the light theme (916ms)
  ok  8 [chromium] › tests\e2e\gallery-app.spec.js:136:3 › completed rows are muted, and cancelled rows are muted and struck through, in the dark theme (922ms)
  ok 10 [chromium] › tests\e2e\gallery-app.spec.js:185:3 › interactive task row, status, and task list specimens are at least 44 by 44 px at 390 px (695ms)
  ok 12 [chromium] › tests\e2e\gallery-app.spec.js:185:3 › interactive task row, status, and task list specimens are at least 44 by 44 px at 1440 px (718ms)
  ok  9 [chromium] › tests\e2e\gallery-app.spec.js:163:1 › every status has its own icon from the sprite (974ms)
  ok 14 [chromium] › tests\e2e\gallery-app.spec.js:249:1 › the status button and task row sections show forced focus-visible specimens with a focus ring (714ms)
  ok 15 [chromium] › tests\e2e\gallery-app.spec.js:266:1 › task row specimens cover every documented state (933ms)
  ok 11 [chromium] › tests\e2e\gallery-app.spec.js:212:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 390 px (2.9s)
  ok 13 [chromium] › tests\e2e\gallery-app.spec.js:212:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 1440 px (3.3s)

  15 passed (7.7s)
```

Command: `E2E_PORT=8792 npm run test:e2e` (exit code 0)

```text

> todos-webapp@0.1.0-pre test:e2e
> playwright test

[... 32 lines omitted ...]
  ok 32 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (250ms)
  ok 33 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (206ms)
  ok 20 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (6.7s)
  ok 23 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (6.7s)

  33 passed (15.8s)
```

### Visual Check
Full-page gallery captures with motion enabled; the after shots show the T0009-only gallery.
Fixes made after inspection: shrinking row buttons and hidden chips on hovered rows.

| Width   | Theme | Before                                                                     | After                                                                    |
| :------ | :---- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| 390 px  | light | [gallery-390-light-before.png](screenshots/gallery-390-light-before.png)   | [gallery-390-light-after.png](screenshots/gallery-390-light-after.png)   |
| 390 px  | dark  | [gallery-390-dark-before.png](screenshots/gallery-390-dark-before.png)     | [gallery-390-dark-after.png](screenshots/gallery-390-dark-after.png)     |
| 1440 px | light | [gallery-1440-light-before.png](screenshots/gallery-1440-light-before.png) | [gallery-1440-light-after.png](screenshots/gallery-1440-light-after.png) |
| 1440 px | dark  | [gallery-1440-dark-before.png](screenshots/gallery-1440-dark-before.png)   | [gallery-1440-dark-after.png](screenshots/gallery-1440-dark-after.png)   |
