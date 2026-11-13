## Walkthrough & Validation

### Red Phase
Run at `56e799b` plus the new tests, before any production change.

```text
$ npx vitest run tests/unit/layout.test.js tests/unit/design-system.test.js tests/unit/tokens.test.js tests/unit/all-tasks.test.js tests/unit/lists.test.js
exit code: 1
[... failure details omitted; summary lines follow ...]
      Tests  11 failed | 240 passed (251)
 FAIL  tests/unit/all-tasks.test.js > mountAllTasks > mounts the add block into the given action bar, keeping the view for the rows
 FAIL  tests/unit/design-system.test.js > the vendored design system > lays out the app with the vendored shell.css, imported after the look and before the app stylesheets
 FAIL  tests/unit/design-system.test.js > the vendored design system > passes the vendored integrity and conformance checks
 FAIL  tests/unit/layout.test.js > renderShell areas (ADR-0004) > adds the action bar after the side panel only while it holds content, and empties it on a new view
 FAIL  tests/unit/layout.test.js > renderShell areas (ADR-0004) > hides each banner slot while it is empty, so the banner area leaves the grid
 FAIL  tests/unit/layout.test.js > renderShell areas (ADR-0004) > marks every navigation link as a shell nav item inside a shell nav list, keeping the app item classes
 FAIL  tests/unit/layout.test.js > renderShell areas (ADR-0004) > opens with a skip link that focuses the main area without changing the route
 FAIL  tests/unit/layout.test.js > renderShell areas (ADR-0004) > puts the toast region in the overlay layer and returns both
 FAIL  tests/unit/layout.test.js > renderShell areas (ADR-0004) > renders the shell areas in skeleton order on a root in the main scroll mode
 FAIL  tests/unit/lists.test.js > mountLists > puts the floating button in the given overlay layer and removes it when the screen closes
 FAIL  tests/unit/tokens.test.js > stylesheets outside tokens.css > are imported by style.css after the vendored tokens: tokens, controls, app components, app chrome, then views
 Test Files  5 failed (5)
```

```text
$ npx playwright test tests/e2e/shell.spec.js -g "places the add bar"
exit code: 1
  x  1 [chromium] › tests\e2e\shell.spec.js:375:3 › the wide layout places the add bar, editor, and floating button in shell areas (7.0s)
  x  2 [chromium] › tests\e2e\shell.spec.js:375:3 › the compact layout places the add bar, editor, and floating button in shell areas (7.4s)
  1) [chromium] › tests\e2e\shell.spec.js:375:3 › the compact layout places the add bar, editor, and floating button in shell areas 
    Error: expect(locator).toBeVisible() failed
    Locator: locator('.app > .app__action-bar').locator('.add-block').getByRole('textbox', { name: 'Search or add a task' })
    Expected: visible
    Error: element(s) not found
  2) [chromium] › tests\e2e\shell.spec.js:375:3 › the wide layout places the add bar, editor, and floating button in shell areas 
    Error: expect(locator).toBeVisible() failed
    Locator: locator('.app > .app__action-bar').locator('.add-block').getByRole('textbox', { name: 'Search or add a task' })
    Expected: visible
    Error: element(s) not found
  2 failed
```
