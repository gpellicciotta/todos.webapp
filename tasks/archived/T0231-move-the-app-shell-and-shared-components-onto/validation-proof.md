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

### Green Phase
Run at `32f511e`, after the final code change.

```text
$ python scripts/devops.py check
exit code: 0
[... per-test lines omitted; step headers and summaries follow ...]
[*] C:\Program Files\nodejs\node.EXE scripts/check-sw-version.mjs
OK: 78 precached files match VERSION 2026-11-13.3.
[*] C:\Program Files\nodejs\node.EXE src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
[*] C:\Program Files\nodejs\npm.CMD test
 Test Files  60 passed (60)
      Tests  1250 passed (1250)
[*] C:\Program Files\nodejs\npm.CMD run lint
[*] C:\Program Files\nodejs\npm.CMD run test:e2e
  198 passed (2.9m)
[*] C:\Program Files\Python312\Scripts\ruff.EXE check scripts tests
All checks passed!
[*] C:\Program Files\Python312\Scripts\ruff.EXE format --check scripts tests
5 files already formatted
[*] C:\Program Files\Python312\python.exe -m pytest -q tests
156 passed in 181.47s (0:03:01)
```

```text
$ node src/vendor/design/bin/check.mjs
exit code: 0
integrity: PASS
conformance: PASS
```

An earlier `devops.py check` run failed once in `tests/unit/serve.test.js`, which read the pid file before the child wrote it.
That test does not touch the shell; it passed in the run above and in the full unit run before it.
A full e2e run under load once timed out in `gallery-controls.spec.js` (400 Tab presses); it passed alone and in the run above.

### Lossless Switch Proof
Captured with T0230's harness, copied to `proof/`: 8 screens at 390 and 1440 px, light and dark, before (`56e799b`) and after.
Every capture recorded no console error, page error, failed request, or HTTP error (`problems.json` is `[]` in all 4 folders).

The raw `compare.mjs` matches elements by full class path, so the new root class `app--scroll-main` makes every path differ.
`proof/compare-shell.mjs` re-roots moved areas at stable anchors and drops shell-only classes before matching.

```text
$ node proof/compare-shell.mjs screenshots/before screenshots/after --limit 0
exit code: 1
dark-1440/all-tasks.json: 173 differences
dark-1440/bin.json: 120 differences
dark-1440/list-editor.json: 248 differences
dark-1440/list.json: 166 differences
dark-1440/lists.json: 139 differences
dark-1440/settings.json: 185 differences
dark-1440/task-editor.json: 348 differences
dark-1440/user-menu.json: 180 differences
dark-390/all-tasks.json: 83 differences
dark-390/bin.json: 63 differences
dark-390/list-editor.json: 135 differences
dark-390/list.json: 89 differences
dark-390/lists.json: 66 differences
dark-390/settings.json: 63 differences
dark-390/task-editor.json: 184 differences
dark-390/user-menu.json: 83 differences
light-1440/all-tasks.json: 173 differences
light-1440/bin.json: 120 differences
light-1440/list-editor.json: 248 differences
light-1440/list.json: 166 differences
light-1440/lists.json: 139 differences
light-1440/settings.json: 185 differences
light-1440/task-editor.json: 348 differences
light-1440/user-menu.json: 180 differences
light-390/all-tasks.json: 83 differences
light-390/bin.json: 63 differences
light-390/list-editor.json: 135 differences
light-390/list.json: 89 differences
light-390/lists.json: 66 differences
light-390/settings.json: 63 differences
light-390/task-editor.json: 184 differences
light-390/user-menu.json: 83 differences
total differences: 4650
```

Every difference falls in one of the groups listed in the task file Doc entry; none is unexplained.
The floating button (`FAB`) shows no difference: the overlay layer places it exactly where app-shell.css did.
