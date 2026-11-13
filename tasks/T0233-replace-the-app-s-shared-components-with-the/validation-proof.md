## Walkthrough & Validation

### Red Phase
The new and changed tests, run before any production change at `ceb160b`.

```text
$ npx vitest run tests/unit/design-system.test.js tests/unit/user-menu.test.js tests/unit/layout.test.js tests/unit/task-editor.test.js
exit code: 1
[... stack traces omitted; FAIL lines and summary kept ...]
FAIL  tests/unit/design-system.test.js > the vendored design system > loads the package through the public neutral look entry point, before the app stylesheets
FAIL  tests/unit/design-system.test.js > the vendored design system > keeps no app copy of a vendored module
FAIL  tests/unit/design-system.test.js > the vendored design system > references only the public entry points of the vendored package from app files
FAIL  tests/unit/design-system.test.js > the vendored design system > points the vendored icons at the look sprite once, at startup
FAIL  tests/unit/layout.test.js > renderShell navigation > ends the top bar with the user button and holds no sync indicator until the sync is shown
FAIL  tests/unit/layout.test.js > renderShell navigation > puts the sync indicator before the bell and the user button, and the session banner above the views
FAIL  tests/unit/layout.test.js > renderShell navigation > keeps Recycle bin and Settings out of the sidebar and the bottom bar
FAIL  tests/unit/layout.test.js > renderShell navigation > marks the panel link of the current route, also for the screens under Settings
FAIL  tests/unit/layout.test.js > renderShell inbox > puts the bell before the user button, and keeps the top bar at a title and one menu slot
FAIL  tests/unit/task-editor.test.js > mountTaskEditor > builds its fields from the vendored field.js skeleton, with the error icon from the look sprite
FAIL  tests/unit/user-menu.test.js > attachUserMenu in local mode > builds the vendored account menu skeleton in the slot
FAIL  tests/unit/user-menu.test.js > attachUserMenu in local mode > shows a person icon named Local User, with Local User as the hover text
FAIL  tests/unit/user-menu.test.js > attachUserMenu in local mode > keeps the menu closed and holds no Sign in button
FAIL  tests/unit/user-menu.test.js > attachUserMenu in local mode > opens a menu with the name, Local only, Recycle bin, and Settings
FAIL  tests/unit/user-menu.test.js > attachUserMenu in local mode > shows each item as a menu item with its icon from the look sprite
FAIL  tests/unit/user-menu.test.js > attachUserMenu in local mode > closes on Escape, on a light dismiss, and when an item is chosen
FAIL  tests/unit/user-menu.test.js > attachUserMenu face > keeps the same face across opens, so the icon does not reload
FAIL  tests/unit/user-menu.test.js > attachUserMenu when connected > shows the initials, and the account name as the hover text
FAIL  tests/unit/user-menu.test.js > attachUserMenu when connected > names the account and says Connected in the menu
FAIL  tests/unit/user-menu.test.js > attachUserMenu when connected > falls back to the email address when the account has no name
FAIL  tests/unit/user-menu.test.js > attachUserMenu when the session expired > keeps the account name, says Sign in needed, and keeps Recycle bin and Settings
FAIL  tests/unit/user-menu.test.js > attachUserMenu session changes > re-renders the status item when the session expires
FAIL  tests/unit/user-menu.test.js > attachUserMenu session changes > re-renders when the device disconnects, and keeps the same items
FAIL  tests/unit/user-menu.test.js > attachUserMenu session changes > shows a name made only of spaces as the email address
Test Files  4 failed (4)
Tests  24 failed | 52 passed (76)
```

```text
$ npx playwright test tests/e2e/shell.spec.js -g "user button|panel stays aligned|connected account|expired session|navigation marks" --reporter=line
exit code: 1
[... grep -E "✘|passed|failed|^\s+[0-9]+\) " applied ...]
  1) [chromium] › tests\e2e\shell.spec.js:123:3 › the compact user button names Local User and opens Recycle bin and Settings 
    Error: expect(locator).toHaveAttribute(expected) failed
  2) [chromium] › tests\e2e\shell.spec.js:123:3 › the wide user button names Local User and opens Recycle bin and Settings 
    Error: expect(locator).toHaveAttribute(expected) failed
  3) [chromium] › tests\e2e\shell.spec.js:196:1 › a connected account shows its initials and name, and Connected in the panel 
    Error: expect(locator).toContainText(expected) failed
  4) [chromium] › tests\e2e\shell.spec.js:219:1 › an expired session shows a banner with Sign in that opens the connect screen 
    Error: expect(locator).toContainText(expected) failed
  5) [chromium] › tests\e2e\shell.spec.js:93:1 › navigation marks the current route, and back and forward move between routes 
  6) [chromium] › tests\e2e\shell.spec.js:177:3 › the narrow panel stays aligned with the button for a long name 
  7) [chromium] › tests\e2e\shell.spec.js:177:3 › the desktop panel stays aligned with the button for a long name 
  7 failed
```

### Green Phase
The completion check after the switch, at `ae9b296`; one earlier run timed out in `serve.test.js`, which this task does not touch.

```text
$ python scripts/devops.py check
exit code: 0
[... per-test lines omitted; command lines and summaries kept ...]
[*] C:\Program Files\nodejs\node.EXE scripts/check-sw-version.mjs
OK: 123 precached files match VERSION 2026-11-13.5.
[*] C:\Program Files\nodejs\node.EXE src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
[*] C:\Program Files\nodejs\npm.CMD test
 Test Files  55 passed (55)
      Tests  1180 passed (1180)
[*] C:\Program Files\nodejs\npm.CMD run lint
[*] C:\Program Files\nodejs\npm.CMD run test:e2e
  198 passed (3.5m)
[*] C:\Program Files\Python312\Scripts\ruff.EXE check scripts tests
All checks passed!
[*] C:\Program Files\Python312\Scripts\ruff.EXE format --check scripts tests
[*] C:\Program Files\Python312\python.exe -m pytest -q tests
156 passed in 136.91s (0:02:16)
```

```text
$ node src/vendor/design/bin/check.mjs
exit code: 0
integrity: PASS
conformance: PASS
```

### Lossless Switch Proof
Captured with T0230's harness, extended in `proof/` with row menu, dialog, field error, toast, and account menu scenes.
Before: `ceb160b`, served from an exported copy; after: the task branch. 13 screens at 390 and 1440 px, light and dark.
Every `problems.json` holds `[]`: no console error, page error, failed request, or HTTP error.
Screenshots: [before](screenshots/before/), [after](screenshots/after/); every difference is listed in technical-spec.md.

```text
$ node proof/compare.mjs screenshots/before screenshots/after --limit 0
exit code: 1
[... 39 capture lines omitted ...]
light-390/account-menu.json: 78 differences
light-390/all-tasks.json: 209 differences
light-390/bin.json: 60 differences
light-390/dialog.json: 200 differences
light-390/field-error.json: 375 differences
light-390/list-editor.json: 199 differences
light-390/list.json: 169 differences
light-390/lists.json: 129 differences
light-390/row-menu.json: 171 differences
light-390/settings.json: 78 differences
light-390/task-editor.json: 371 differences
light-390/toast.json: 143 differences
light-390/user-menu.json: 199 differences
total differences: 9704
```

### Review Round 1 Red Phase
New tests for the review findings, run before the rework at `ae9b296`.

```text
$ npx vitest run tests/unit/task-editor.test.js
exit code: 1
[... passing tests and stack traces omitted ...]
FAIL  tests/unit/task-editor.test.js > mountTaskEditor > marks every visible segmented legend with the package .segmented__legend class
FAIL  tests/unit/task-editor.test.js > mountTaskEditor by role (SHR-4, SHR-5) > builds each list chip from the package skeleton, with a .chip__remove button
     Tests  2 failed | 28 passed (30)
```

```text
$ npx playwright test tests/e2e/gallery-controls.spec.js -g "segmented legends|chip__remove|hint and counter" --reporter=line
exit code: 1
[... grep -E "^\s+[0-9]+\) \[|Error:|failed" applied ...]
  1) [chromium] › tests\e2e\gallery-controls.spec.js:203:1 › visible segmented legends use the package .segmented__legend class and its medium weight 
    Error: Status
  2) [chromium] › tests\e2e\gallery-controls.spec.js:218:1 › removable chips use .chip__remove: chip corners, a raised hover ground in light mode, and a quiet disabled state 
    Error: expect(received).toBe(expected) // Object.is equality
  3) [chromium] › tests\e2e\gallery-controls.spec.js:238:1 › the field hint and counter are direct children on one row, the counter at the end 
    Error: expect(locator).toHaveCount(expected) failed
  3 failed
```

### Review Round 1 Green Phase
The completion check after the rework, at `8714efd`.

```text
$ python scripts/devops.py check
exit code: 0
[... per-test lines omitted; command lines and summaries kept ...]
[*] C:\Program Files\nodejs\node.EXE scripts/check-sw-version.mjs
OK: 123 precached files match VERSION 2026-11-13.6.
[*] C:\Program Files\nodejs\node.EXE src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
[*] C:\Program Files\nodejs\npm.CMD test
 Test Files  55 passed (55)
      Tests  1182 passed (1182)
[*] C:\Program Files\nodejs\npm.CMD run lint
[*] C:\Program Files\nodejs\npm.CMD run test:e2e
  201 passed (2.6m)
[*] C:\Program Files\Python312\Scripts\ruff.EXE check scripts tests
All checks passed!
[*] C:\Program Files\Python312\Scripts\ruff.EXE format --check scripts tests
[*] C:\Program Files\Python312\python.exe -m pytest -q tests
156 passed in 226.76s (0:03:46)
```

```text
$ node proof/compare.mjs screenshots/before screenshots/after --limit 0
exit code: 1
[... 51 capture lines omitted; after capture retaken at 8714efd, every problems.json holds [] ...]
light-390/user-menu.json: 199 differences
total differences: 9312
```
