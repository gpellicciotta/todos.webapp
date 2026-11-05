## Walkthrough & Validation

### Red Phase
The tests ran before controls.css, the new tokens, and the control gallery sections existed.
Output blocks drop ANSI codes and trailing spaces only.

Command: `npx vitest run tests/unit/tokens.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/tokens.test.js (77 tests | 8 failed) 76ms
   ❯ tokens.css (72)
     ❯ light theme (35)
       × --color-on-signal on --color-signal-active reaches 4.5:1 7ms
       × --color-text on --color-active-bg reaches 4.5:1 1ms
       × --color-link on --color-active-bg reaches 4.5:1 1ms
     ❯ dark theme (35)
       × --color-on-signal on --color-signal-active reaches 4.5:1 1ms
       × --color-text on --color-active-bg reaches 4.5:1 1ms
       × --color-link on --color-active-bg reaches 4.5:1 1ms
   ❯ stylesheets outside tokens.css (3)
     × include style.css, fonts.css, controls.css, and the gallery stylesheet 8ms
     × are imported by style.css in order: fonts, tokens, then controls 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tokens.test.js > tokens.css > light theme > --color-on-signal on --color-signal-active reaches 4.5:1
 FAIL  tests/unit/tokens.test.js > tokens.css > dark theme > --color-on-signal on --color-signal-active reaches 4.5:1
Error: undefined token --color-signal-active
[... 75 lines omitted ...]


 Test Files  1 failed (1)
      Tests  8 failed | 69 passed (77)
   Start at  02:38:15
   Duration  441ms (tests 46%, transform 31%, import 16%, worker 7%)
```

The first end-to-end run let the target test pass with no specimens found.
The test now also requires at least 40 measured specimens; this is its rerun.

Command: `npx playwright test tests/e2e/gallery-controls.spec.js` (exit code 1)

```text

Running 8 tests using 4 workers

  x  3 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 390 px (1.2s)
  x  2 [chromium] › tests\e2e\gallery-controls.spec.js:117:3 › every keyboard stop in the control sections shows a focus ring at 390 px (1.5s)
  x  1 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the dark theme (6.1s)
  x  4 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the light theme (6.0s)
  x  7 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 1440 px (760ms)
  x  5 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the light theme (5.7s)
  x  6 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the dark theme (5.7s)
  x  8 [chromium] › tests\e2e\gallery-controls.spec.js:117:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (946ms)

[... 244 lines omitted ...]

  8 failed
    [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the light theme
    [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the dark theme
    [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 390 px
    [chromium] › tests\e2e\gallery-controls.spec.js:117:3 › every keyboard stop in the control sections shows a focus ring at 390 px
    [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the light theme
    [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the dark theme
    [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 1440 px
    [chromium] › tests\e2e\gallery-controls.spec.js:117:3 › every keyboard stop in the control sections shows a focus ring at 1440 px
```

### Green Phase
During implementation, the focus ring test caught date and time inputs without a ring.
Their picker buttons never match `:focus-visible`, so field controls now ring on `:focus-within`.
The target test now skips controls that are not rendered, such as the closed modal dialog.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  8 passed (8)
      Tests  196 passed (196)
   Start at  02:46:33
   Duration  1.08s (import 53%, tests 34%, transform 9%, worker 4%)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run test:e2e` (exit code 0)

```text

> todos-webapp@0.1.0-pre test:e2e
> playwright test


Running 15 tests using 4 workers

  ok  1 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 390 px (1.3s)
  ok  3 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the light theme (1.9s)
  ok  2 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the dark theme (2.4s)
  ok  5 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the light theme (1.6s)
  ok  7 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 1440 px (826ms)
  ok  6 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the dark theme (1.7s)
  ok  9 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme (1.2s)
  ok 10 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the dark theme (1.1s)
  ok 11 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the light theme (1.1s)
  ok 12 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the dark theme (1.2s)
  ok 14 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (344ms)
  ok 13 [chromium] › tests\e2e\gallery.spec.js:106:1 › gallery follows the system theme when System is selected (1.2s)
  ok 15 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (361ms)
  ok  8 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (4.5s)
  ok  4 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (7.1s)

  15 passed (9.7s)
```

Command: `python ../dev-guidelines/scripts/lint-markdown.py check docs` (exit code 0)

```text
Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 6 markdown files passed linting.
Finished lint-markdown check in 0.1s with status: succeeded
```

### Visual Check
Before captures show the committed gallery with token sections only; motion was not reduced.
After captures add the twelve control sections, with HTTP 200, no console errors, and no horizontal scrolling.
The modal dialog was also opened by hand: a full-height sheet at 390 px, a centered card at 1440 px.

| Width   | Theme | Before                                                                     | After                                                                    |
| :------ | :---- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| 390 px  | light | [gallery-390-light-before.png](screenshots/gallery-390-light-before.png)   | [gallery-390-light-after.png](screenshots/gallery-390-light-after.png)   |
| 390 px  | dark  | [gallery-390-dark-before.png](screenshots/gallery-390-dark-before.png)     | [gallery-390-dark-after.png](screenshots/gallery-390-dark-after.png)     |
| 1440 px | light | [gallery-1440-light-before.png](screenshots/gallery-1440-light-before.png) | [gallery-1440-light-after.png](screenshots/gallery-1440-light-after.png) |
| 1440 px | dark  | [gallery-1440-dark-before.png](screenshots/gallery-1440-dark-before.png)   | [gallery-1440-dark-after.png](screenshots/gallery-1440-dark-after.png)   |

### Review Rework
Review round 1 asked for focus specimens, pressed hover and active states, and logical banner edges.
It also asked for icon contrast tests and named tokens instead of unitless multipliers.

The new end-to-end tests ran first, before any gallery or stylesheet change:

Command: `npx playwright test tests/e2e/gallery-controls.spec.js -g "focus-visible specimen|include a focus-visible|pressed toggles"` (exit code 1)

```text

Running 3 tests using 3 workers

  x  2 [chromium] › tests\e2e\gallery-controls.spec.js:159:1 › every control section shows a forced focus-visible specimen with a focus ring (948ms)
  x  1 [chromium] › tests\e2e\gallery-controls.spec.js:175:1 › checkbox, radio, segmented, and menu specimens include a focus-visible state (6.0s)
  x  3 [chromium] › tests\e2e\gallery-controls.spec.js:187:1 › pressed toggles keep distinct hover and active feedback (6.1s)
[... 2 lines omitted ...]
  1) [chromium] › tests\e2e\gallery-controls.spec.js:159:1 › every control section shows a forced focus-visible specimen with a focus ring

    Error: expect(received).toEqual(expected) // deep equality

    - Expected  -  1
    + Received  + 10

    - Array []
    + Array [
    +   "checkbox-radio",
    +   "chip",
    +   "segmented-control",
    +   "menu",
    +   "popover",
    +   "dialog",
    +   "banner",
    +   "toast",
    + ]
[... 22 lines omitted ...]
    Error: #checkbox-radio input[type="checkbox"].is-focus
[... 3 lines omitted ...]
    Locator:  locator('#checkbox-radio input[type="checkbox"].is-focus')
    Expected: 1
    Received: 0
[... 30 lines omitted ...]
    Error: icon-button pressed .is-hover
[... 3 lines omitted ...]
    Locator:  locator('#icon-button .icon-button[aria-pressed="true"].is-hover')
    Expected: 1
    Received: 0
[... 32 lines omitted ...]
```

The pressed test later excluded forced states from its default selector, which then matched three toggles.

The new icon contrast tests passed against the existing tokens, so no color changed:

Command: `npx vitest run tests/unit/tokens.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  1 passed (1)
      Tests  113 passed (113)
   Start at  15:39:14
   Duration  298ms (tests 48%, transform 28%, import 18%, worker 6%)
```

The reported 2.3:1 and 1.6:1 check icon ratios did not reproduce in the rendered gallery.
This throwaway measurement reads computed colors of every menu icon and its ground:

Command: `node icon-contrast.mjs C:/Dev-Projects/todos.webapp` (exit code 0)

```text
Light {
  'To do': 'rgb(124, 58, 237) on rgb(255, 255, 255): 5.70',
  'In progress (hover)': 'rgb(124, 58, 237) on rgb(238, 238, 242): 4.92',
  'Completed (focus-visible)': 'rgb(124, 58, 237) on rgb(255, 255, 255): 5.70',
  Cancelled: 'rgb(124, 58, 237) on rgb(255, 255, 255): 5.70',
  'Add to list': 'rgb(17, 18, 22) on rgb(255, 255, 255): 18.72',
  'Remove from this list': 'rgb(17, 18, 22) on rgb(255, 255, 255): 18.72',
  'Move up (active)': 'rgb(17, 18, 22) on rgb(226, 226, 232): 14.51',
  'Move down (disabled)': 'rgb(163, 163, 176) on rgb(255, 255, 255): 2.49',
  Delete: 'rgb(17, 18, 22) on rgb(255, 255, 255): 18.72'
}
Dark {
  'To do': 'rgb(167, 139, 250) on rgb(26, 26, 31): 6.37',
  'In progress (hover)': 'rgb(167, 139, 250) on rgb(46, 46, 54): 4.95',
  'Completed (focus-visible)': 'rgb(167, 139, 250) on rgb(26, 26, 31): 6.37',
  Cancelled: 'rgb(167, 139, 250) on rgb(26, 26, 31): 6.37',
  'Add to list': 'rgb(247, 247, 249) on rgb(26, 26, 31): 16.20',
  'Remove from this list': 'rgb(247, 247, 249) on rgb(26, 26, 31): 16.20',
  'Move up (active)': 'rgb(247, 247, 249) on rgb(70, 70, 81): 8.70',
  'Move down (disabled)': 'rgb(94, 94, 107) on rgb(26, 26, 31): 2.72',
  Delete: 'rgb(247, 247, 249) on rgb(26, 26, 31): 16.20'
}
```

Disabled items fall below 3:1 on purpose; WCAG 2.2 exempts disabled controls.

Checks after the rework:

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  9 passed (9)
      Tests  293 passed (293)
   Start at  15:42:35
   Duration  926ms (tests 45%, import 43%, transform 8%, worker 4%)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run test:e2e` (exit code 0)

```text

> todos-webapp@0.1.0-pre test:e2e
> playwright test


Running 18 tests using 4 workers

  ok  3 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 390 px (1.1s)
  ok  1 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the dark theme (1.6s)
  ok  4 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 390 px in the light theme (1.3s)
  ok  5 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the light theme (1.2s)
  ok  7 [chromium] › tests\e2e\gallery-controls.spec.js:93:3 › interactive control specimens are at least 44 by 44 px at 1440 px (677ms)
  ok  6 [chromium] › tests\e2e\gallery-controls.spec.js:70:5 › control sections render at 1440 px in the dark theme (1.3s)
  ok  9 [chromium] › tests\e2e\gallery-controls.spec.js:159:1 › every control section shows a forced focus-visible specimen with a focus ring (679ms)
  ok 10 [chromium] › tests\e2e\gallery-controls.spec.js:175:1 › checkbox, radio, segmented, and menu specimens include a focus-visible state (727ms)
  ok 11 [chromium] › tests\e2e\gallery-controls.spec.js:187:1 › pressed toggles keep distinct hover and active feedback (1.0s)
  ok  2 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (4.1s)
  ok 12 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme (969ms)
  ok 13 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the dark theme (1.2s)
  ok 14 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the light theme (1.3s)
  ok 15 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the dark theme (1.0s)
  ok 17 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (342ms)
  ok 18 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (251ms)
  ok 16 [chromium] › tests\e2e\gallery.spec.js:106:1 › gallery follows the system theme when System is selected (862ms)
  ok  8 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (4.1s)

  18 passed (8.2s)
```

Command: `python ../dev-guidelines/scripts/lint-markdown.py check docs` (exit code 0)

```text
Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 6 markdown files passed linting.
Finished lint-markdown check in 0.1s with status: succeeded
```

The after screenshots were captured again after the rework; the links above are unchanged.
