## Walkthrough & Validation
T0031 was split from T0009 on 2026-11-04; its code was written during T0009.
Output blocks drop ANSI codes and trailing spaces only.

### Red Phase
The tests ran against the T0009-only tree, which lacks app-chrome.css and the chrome sections.

Command: `npx vitest run tests/unit/tokens.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/t0009-tree

 ❯ tests/unit/tokens.test.js (113 tests | 2 failed) 73ms
   ❯ stylesheets outside tokens.css (3)
     × include style.css, fonts.css, controls.css, the app stylesheets, and the gallery stylesheet 13ms
     × are imported by style.css in order: fonts, tokens, controls, app components, then app chrome 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tokens.test.js > stylesheets outside tokens.css > include style.css, fonts.css, controls.css, the app stylesheets, and the gallery stylesheet
AssertionError: expected [ 'app-components.css', …(4) ] to deeply equal ArrayContaining{…}

- Expected
+ Received

- ArrayContaining [
-   "style.css",
-   "fonts.css",
-   "controls.css",
+ [
    "app-components.css",
[... 40 lines omitted ...]


 Test Files  1 failed (1)
      Tests  2 failed | 111 passed (113)
   Start at  16:12:56
   Duration  322ms (tests 55%, transform 22%, import 17%, worker 5%)
```

Command: `E2E_PORT=8792 npx playwright test tests/e2e/gallery-chrome.spec.js` (exit code 1)

```text

Running 12 tests using 4 workers

  x   1 [chromium] › tests\e2e\gallery-chrome.spec.js:61:5 › chrome sections render at 1440 px in the dark theme (6.3s)
  x   3 [chromium] › tests\e2e\gallery-chrome.spec.js:61:5 › chrome sections render at 390 px in the dark theme (6.2s)
  x   2 [chromium] › tests\e2e\gallery-chrome.spec.js:61:5 › chrome sections render at 1440 px in the light theme (6.2s)
  x   4 [chromium] › tests\e2e\gallery-chrome.spec.js:61:5 › chrome sections render at 390 px in the light theme (6.2s)
  x   8 [chromium] › tests\e2e\gallery-chrome.spec.js:126:3 › interactive chrome specimens are at least 44 by 44 px at 390 px (1.0s)
  x   9 [chromium] › tests\e2e\gallery-chrome.spec.js:153:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px (2.2s)
  x   5 [chromium] › tests\e2e\gallery-chrome.spec.js:86:1 › every sync state has its own icon and label, plus the unseen entries dot (6.0s)
  x  10 [chromium] › tests\e2e\gallery-chrome.spec.js:126:3 › interactive chrome specimens are at least 44 by 44 px at 1440 px (729ms)
  x   6 [chromium] › tests\e2e\gallery-chrome.spec.js:108:1 › navigation marks the current route with aria-current in the sidebar and the bottom bar (6.2s)
  x  12 [chromium] › tests\e2e\gallery-chrome.spec.js:190:1 › every chrome component section shows a forced focus-visible specimen with a focus ring (782ms)
  x  11 [chromium] › tests\e2e\gallery-chrome.spec.js:153:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px (3.3s)
  x   7 [chromium] › tests\e2e\gallery-chrome.spec.js:99:1 › the syncing icon spins only without reduced motion (30.1s)


  1) [chromium] › tests\e2e\gallery-chrome.spec.js:61:5 › chrome sections render at 390 px in the light theme

    Error: Navigation

    expect(locator).toHaveCount(expected) failed

    Locator:  locator('#navigation, #sync-indicator, #editor-panel, #note-thread, #empty-state, #task-editor').filter({ has: getByRole('heading', { name: 'Navigation', exact: true, level: 2 }) })
    Expected: 1
    Received: 0
    Timeout:  5000ms

    Call log:
      - Navigation locator('#navigation, #sync-indicator, #editor-panel, #note-thread, #empty-state, #task-editor').filter({ has: getByRole('heading', { name: 'Navigation', exact: true, level: 2 }) }) with timeout 5000ms
      - waiting for locator('#navigation, #sync-indicator, #editor-panel, #note-thread, #empty-state, #task-editor').filter({ has: getByRole('heading', { name: 'Navigation', exact: true, level: 2 }) })
        14 × locator resolved to 0 elements
           - unexpected value "0"


      67 |           has: page.getByRole('heading', { level: 2, name, exact: true }),
[... 372 lines omitted ...]
```

### Green Phase
All runs below use the full working tree; `E2E_PORT` only moves the test server off the shared port.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  15 passed (15)
      Tests  434 passed (434)
   Start at  16:13:46
   Duration  2.62s (environment 55%, tests 23%, import 17%, transform 4%, worker 2%)

    Isolate  15 workers spawned · ~650ms startup each (spawn + environment, per file)
             at least ~743ms faster with isolate: false — reuses workers across files instead of one per file
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

[... 18 lines omitted ...]
  ok 18 [chromium] › tests\e2e\gallery-chrome.spec.js:61:5 › chrome sections render at 1440 px in the light theme (1.3s)
  ok 19 [chromium] › tests\e2e\gallery-chrome.spec.js:61:5 › chrome sections render at 1440 px in the dark theme (1.5s)
  ok 20 [chromium] › tests\e2e\gallery-chrome.spec.js:86:1 › every sync state has its own icon and label, plus the unseen entries dot (1.4s)
  ok 21 [chromium] › tests\e2e\gallery-chrome.spec.js:99:1 › the syncing icon spins only without reduced motion (1.3s)
  ok 22 [chromium] › tests\e2e\gallery-chrome.spec.js:108:1 › navigation marks the current route with aria-current in the sidebar and the bottom bar (1.3s)
  ok 11 [chromium] › tests\e2e\gallery-app.spec.js:212:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 390 px (7.2s)
  ok 23 [chromium] › tests\e2e\gallery-chrome.spec.js:126:3 › interactive chrome specimens are at least 44 by 44 px at 390 px (987ms)
  ok 25 [chromium] › tests\e2e\gallery-chrome.spec.js:126:3 › interactive chrome specimens are at least 44 by 44 px at 1440 px (859ms)
  ok 27 [chromium] › tests\e2e\gallery-chrome.spec.js:190:1 › every chrome component section shows a forced focus-visible specimen with a focus ring (865ms)
  ok 13 [chromium] › tests\e2e\gallery-app.spec.js:212:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 1440 px (9.5s)
  ok 28 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the light theme (1.6s)
  ok 30 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 390 px (836ms)
  ok 29 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the dark theme (1.7s)
  ok 32 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the light theme (1.9s)
  ok 24 [chromium] › tests\e2e\gallery-chrome.spec.js:153:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px (7.4s)
  ok 34 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 1440 px (786ms)
  ok 33 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the dark theme (1.7s)
  ok 36 [chromium] › tests\e2e\gallery-controls.spec.js:159:1 › every control section shows a forced focus-visible specimen with a focus ring (830ms)
  ok 37 [chromium] › tests\e2e\gallery-controls.spec.js:175:1 › checkbox, radio, segmented, and menu specimens include a focus-visible state (1.0s)
  ok 26 [chromium] › tests\e2e\gallery-chrome.spec.js:153:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px (9.8s)
  ok 38 [chromium] › tests\e2e\gallery-controls.spec.js:187:1 › pressed toggles keep distinct hover and active feedback (1.2s)
  ok 39 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme (1.3s)
  ok 40 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the dark theme (1.2s)
  ok 41 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the light theme (1.2s)
  ok 42 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the dark theme (1.2s)
  ok 43 [chromium] › tests\e2e\gallery.spec.js:106:1 › gallery follows the system theme when System is selected (1.1s)
  ok 44 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (220ms)
  ok 45 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (238ms)
  ok 31 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (10.9s)
  ok 35 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (10.8s)

  45 passed (30.5s)
```

### Visual Check
Before shows the T0009-only gallery, after the full gallery, with motion enabled.
Fixes made after inspection: a clipped close button ring, a shrinking close button, and an overflowing due row.

| Width   | Theme | Before                                                                     | After                                                                    |
| :------ | :---- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| 390 px  | light | [gallery-390-light-before.png](screenshots/gallery-390-light-before.png)   | [gallery-390-light-after.png](screenshots/gallery-390-light-after.png)   |
| 390 px  | dark  | [gallery-390-dark-before.png](screenshots/gallery-390-dark-before.png)     | [gallery-390-dark-after.png](screenshots/gallery-390-dark-after.png)     |
| 1440 px | light | [gallery-1440-light-before.png](screenshots/gallery-1440-light-before.png) | [gallery-1440-light-after.png](screenshots/gallery-1440-light-after.png) |
| 1440 px | dark  | [gallery-1440-dark-before.png](screenshots/gallery-1440-dark-before.png)   | [gallery-1440-dark-after.png](screenshots/gallery-1440-dark-after.png)   |
