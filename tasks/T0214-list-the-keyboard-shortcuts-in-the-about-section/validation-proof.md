## Walkthrough & Validation

### Key Changes
- About in Settings lists five keyboard shortcuts from one frozen `SHORTCUTS` array in `settings.js`.
- `kbd` is a base element in `style.css`, shown in the gallery's Families and figures specimens.
- Service worker VERSION moved to `2026-11-10.3`, after the concurrent commit 20a80b1 took `2026-11-10.1`.

### Environment
- A concurrent session edited the add bar files in the primary checkout during this task.
- Final runs used a clean detached worktree at HEAD `a607f2f` plus only the T0214 files.

### Red Phase
Command: `npx vitest run tests/unit/settings.test.js` (exit 1)

```text
     × lists the five shortcuts under a Keyboard shortcuts heading, in order, with each key in a kbd 19ms
     × joins alternative keys with "or", so a screen reader reads each term as text 12ms
     × sits after the version line and before the source link 8ms
TypeError: Cannot read properties of null (reading 'textContent')
AssertionError: expected [] to deeply equal [ 'n or /', …(4) ]
AssertionError: expected [ false, false, true ] to deeply equal [ true, true, true ]
      Tests  3 failed | 13 passed (16)
```

Command: `E2E_PORT=18899 npx playwright test tests/e2e/bin-settings.spec.js -g "keyboard shortcuts"` (exit 1)

```text
    Error: expect(locator).toBeVisible() failed
    Error: element(s) not found
    Error: expect(locator).toBeVisible() failed
    Error: element(s) not found
  2 failed
```

### Green Phase
Command: `npx eslint src tests` (exit 0, no output)

Command: `node scripts/check-sw-version.mjs` (exit 0)

```text
OK: 75 precached files match VERSION 2026-11-09.4.
```

Command: `npx vitest run` (exit 0)

```text
 Test Files  59 passed (59)
      Tests  1217 passed (1217)
```

Command: `E2E_PORT=18899 npx playwright test` (exit 1)

```text
  ok  47 [chromium] › tests\e2e\bin-settings.spec.js:187:3 › About lists the keyboard shortcuts at wide width without a horizontal scroll (1.3s)
  ok  48 [chromium] › tests\e2e\bin-settings.spec.js:187:3 › About lists the keyboard shortcuts at compact width without a horizontal scroll (2.0s)
[... 189 lines omitted ...]
  1) [chromium] › tests\e2e\gallery-chrome.spec.js:257:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px
    Error: keyboard.press: Test timeout of 30000ms exceeded.
  2) [chromium] › tests\e2e\gallery-chrome.spec.js:257:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px
    Error: keyboard.press: Test timeout of 30000ms exceeded.
  2 failed
  191 passed (4.2m)
```

Expected exemption: the two failures are load timeouts, not regressions.
The suite took 4.2 minutes instead of 1.9 while the concurrent session ran tests.
The new `kbd` specimen has no focusable element, and the spec passes alone:

Command: `E2E_PORT=18899 npx playwright test tests/e2e/gallery-chrome.spec.js` (exit 0)

```text
  ok 14 [chromium] › tests\e2e\gallery-chrome.spec.js:257:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px (10.8s)
  ok 16 [chromium] › tests\e2e\gallery-chrome.spec.js:257:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px (15.9s)
  17 passed (24.1s)
```

### Review Round 1 Rerun
Ran in the primary checkout on HEAD `20a80b1`, holding only the T0214 files.

Command: `npx eslint src tests` (exit 0, no output)

Command: `node scripts/check-sw-version.mjs --update` (exit 0)

```text
OK: wrote 75 hashes for VERSION 2026-11-10.3 to {{project-root}}/scripts/sw-precache-hashes.json
```

Command: `npx vitest run` (exit 0)

```text
 Test Files  59 passed (59)
      Tests  1220 passed (1220)
```

Command: `E2E_PORT=18899 npx playwright test` (exit 1)

```text
  ok  49 [chromium] › tests\e2e\bin-settings.spec.js:187:3 › About lists the keyboard shortcuts at compact width without a horizontal scroll (1.2s)
  ok  48 [chromium] › tests\e2e\bin-settings.spec.js:187:3 › About lists the keyboard shortcuts at wide width without a horizontal scroll (1.7s)
[... 191 lines omitted ...]
  1) [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px
  1 failed
  193 passed (2.5m)
```

Expected exemption: the same slow keyboard-stop gallery tests time out under parallel load, and pass alone.

Command: `E2E_PORT=18899 npx playwright test tests/e2e/gallery-controls.spec.js tests/e2e/gallery-chrome.spec.js tests/e2e/gallery.spec.js -g "keyboard stop"` (exit 0)

```text
  ok 3 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (13.9s)
  ok 4 [chromium] › tests\e2e\gallery-chrome.spec.js:257:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px (15.2s)
  ok 2 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (16.1s)
  ok 1 [chromium] › tests\e2e\gallery-chrome.spec.js:257:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px (17.6s)
  4 passed (21.0s)
```

### Visual Verification
Each capture loaded with HTTP 200, no console errors, no failed requests, and no horizontal scroll.

| View                  | Before                                                      | After                                                     |
| :-------------------- | :---------------------------------------------------------- | :-------------------------------------------------------- |
| About, 390 px, light  | [before](before-about-compact-light.png)                    | [after](after-about-compact-light.png)                    |
| About, 390 px, dark   | [before](before-about-compact-dark.png)                     | [after](after-about-compact-dark.png)                     |
| About, 1440 px, light | [before](before-about-wide-light.png)                       | [after](after-about-wide-light.png)                       |
| About, 1440 px, dark  | [before](before-about-wide-dark.png)                        | [after](after-about-wide-dark.png)                        |
| Gallery, light        | [before](before-gallery-families-light.png)                 | [after](after-gallery-families-light.png)                 |
| Gallery, dark         | [before](before-gallery-families-dark.png)                  | [after](after-gallery-families-dark.png)                  |
| Gallery, 390 px light | none (added in review round 1)                              | [after](after-gallery-families-compact-light.png)         |
| Gallery, 390 px dark  | none (added in review round 1)                              | [after](after-gallery-families-compact-dark.png)          |
