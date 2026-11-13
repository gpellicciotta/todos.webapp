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
