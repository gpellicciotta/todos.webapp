## Walkthrough & Validation

### Summary
- Vendored support.webapp v0.2.0 (commit 276cc51); v0.2.1 has no release, see [technical-spec.md](technical-spec.md).
- Adapted focus glows, separators, the account panel, and the precache (commit 3222844).
- Fixed two stale e2e tests and a Ruff reformat that failed on main e5c72a2 (commit f54e596).
- Harness: [proof/capture.spec.js](proof/capture.spec.js), [proof/capture.config.js](proof/capture.config.js),
  [proof/compare.mjs](proof/compare.mjs), and [proof/ratios.spec.js](proof/ratios.spec.js).

### Completion Check
`python scripts/devops.py check`, run through the worktree's `.venv` with support-python 3.3.0, pytest 9.2.0, and Ruff 0.17.5.
Exit code: 0.

```text
OK: 141 precached files match VERSION 2026-11-17.35.
integrity: PASS
conformance: PASS
[... unit test lines omitted ...]
 Test Files  66 passed (66)
      Tests  1756 passed (1756)
[... e2e test lines omitted ...]
  271 passed (5.5m)
[... lint output omitted ...]
All checks passed!
4 files already formatted
[... pytest progress omitted ...]
189 passed in 188.25s (0:03:08)
```

The global Python's support-python 3.1.0 failed three release tests in `test_devops.py`; the pinned `.venv` passes them.

### Vendored Integrity Check
`node src/vendor/design/bin/check.mjs`. Exit code: 0.

```text
integrity: PASS
conformance: PASS
```

### Red Phase
`npx playwright test tests/e2e/focus.spec.js tests/e2e/gallery-app.spec.js tests/e2e/gallery-chrome.spec.js tests/e2e/gallery-controls.spec.js tests/e2e/gallery-danger.spec.js tests/e2e/shell.spec.js --reporter=line`,
after vendoring and before the CSS changes, filtered to failure lines. Exit code: 1.

```text
  1) [chromium] › tests\e2e\focus.spec.js:24:5 › rows and bottom bar items draw one focus glow inside their edge at 1440 px in the light theme 
[... 3 more theme and width variants of the same failure omitted ...]
  5) [chromium] › tests\e2e\focus.spec.js:81:1 › the separators draw only their focus line, between the top bar and the action bar 
    expect(received).toBeGreaterThanOrEqual(expected)
    Expected: >= 55
    Received:    0
  6) [chromium] › tests\e2e\gallery-chrome.spec.js:279:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px 
    +   "navigation: a \"Tasks, active\"",
    +   "navigation: a \"Tasks\"",
  8) [chromium] › tests\e2e\gallery-controls.spec.js:123:3 › every keyboard stop in the control sections shows a focus ring at 390 px 
    +   "filter-chip: button \"Status: open\"",
    +   "filter-chip: button \"Lists: Groceries\"",
    +   "filter-chip: button \"Due: this week\"",
  10) [chromium] › tests\e2e\shell.spec.js:327:3 › the narrow panel stays aligned with the button for a long name 
    Error: expect(received).toBeLessThanOrEqual(expected)
    Expected: <= 1
    Received:    4
  10 failed
  82 passed (1.0m)
```

### Green Phase
The same command after the CSS changes. Exit code: 0.

```text
  92 passed (56.3s)
```

### Visual Verification
Each capture run loads the app over HTTP 200 and fails on console errors, page errors, failed requests, or HTTP 400 and higher.
`$env:CAPTURE_OUT='<companion>/screenshots/after'; npx playwright test work/t0283/capture.spec.js --config work/t0283/capture.config.js`. Exit code: 0.

```text
  ok 1 [chromium] › work\t0283\capture.spec.js:81:5 › light 390 (5.0s)
  ok 2 [chromium] › work\t0283\capture.spec.js:81:5 › light 1440 (5.4s)
  ok 3 [chromium] › work\t0283\capture.spec.js:81:5 › dark 390 (4.9s)
  ok 4 [chromium] › work\t0283\capture.spec.js:81:5 › dark 1440 (5.5s)
  4 passed (22.2s)
```

Sets, each with `light-390`, `light-1440`, `dark-390`, and `dark-1440` folders of screenshots and computed styles:
- `screenshots/before`: on main e5c72a2 with support.webapp 0.1.0.
- `screenshots/vendored`: v0.2.0 vendored, app styles unchanged.
- `screenshots/after`: v0.2.0 with the app adaptations.

Key pairs:
- Wide task editor: [before](screenshots/before/light-1440/task-editor.png), [after](screenshots/after/light-1440/task-editor.png).
- Wide focus: [before](screenshots/before/light-1440/focus.png), [vendored, double ring](screenshots/vendored/light-1440/focus.png), [after](screenshots/after/light-1440/focus.png).
- Compact list: [before](screenshots/before/dark-390/list.png), [after](screenshots/after/dark-390/list.png).
- Compact settings: [before](screenshots/before/light-390/settings.png), [after](screenshots/after/light-390/settings.png).
- Compact user menu: [before](screenshots/before/dark-390/user-menu.png), [after](screenshots/after/dark-390/user-menu.png).

### Comparison
`node work/t0283/compare.mjs <companion>/screenshots/vendored <companion>/screenshots/after --props box,padding,margin,box-shadow,outline-style,outline-color`, filtered.
The app adaptations change only the focus drawing; every other screen matches the vendored-only set.

```text
light-1440/focus.json: 3 differences
  .task-row box-shadow: none -> rgb(37, 99, 235) 0px 0px 0px 2px inset, color(srgb 0.145098 0.388235 0.921569 / 0.2) 0px 0px 4px 2px inset
  .task-row outline-color: rgb(37, 99, 235) -> rgba(0, 0, 0, 0)
  :focus-visible box-shadow: rgb(37, 99, 235) 0px 0px 0px 2px, color(srgb 0.145098 0.388235 0.921569 / 0.2) 0px 0px 4px 2px -> none
[... the same 3 differences at the other three captures, and 0 on every other screen, omitted ...]
```

Before to after, every difference is a fix or a deliberate package change:
- Deliberate, package: full-width top bar and action bar at 1440 px; sidebar below the top bar with 8 px padding.
- Deliberate, package: top bar padding on the content gutters, so the user button ends 32 px from the edge at 1440 px, 16 px at 390 px.
- Deliberate, package: slate grays and a brighter blue; tabs with top-only corners; menu side padding; banner action padding; switch and select shapes.
- Deliberate, package: the add bar spans the action bar between the gutters at 1440 px.
- Fix, app: the double focus ring on task rows, and missing glows on active filter chips and the current bottom bar item.
- Fix, app: separators crossing the top bar and action bar, and the account panel 4 px off its button on 320 px screens.
- Search for renamed tokens: none; v0.2.0 adds `--focus-glow*` tokens and renames nothing.
