## Walkthrough & Validation

### Key Changes
- `src/index.html` loads `vendor/design/js/theme-boot.js` with `data-theme-switch-app="todos"` after a `color-scheme` meta.
- `writeTheme` stores `light` and `dark` plain and removes `todos.theme` for `system`.
- `applyTheme` keeps the `color-scheme` meta in step with live changes from Settings.
- The service worker precaches the boot script; VERSION is `2026-11-24.10`.
- The precache and public-entry tests follow the classic script in index.html.

### Tests Fail Before the Implementation
Command: `npx vitest run tests/unit/preferences.test.js tests/unit/layout.test.js` (exit code 1, filtered to results)

```text
     × stores light and dark plain under todos.theme, which the vendored theme-boot.js reads 11ms
     × removes todos.theme for system, so theme-boot.js leaves the page on the system theme 2ms
     × keeps the color-scheme meta that theme-boot.js set in step with live theme changes 18ms
 FAIL  tests/unit/layout.test.js > applyTheme > keeps the color-scheme meta that theme-boot.js set in step with live theme changes
AssertionError: expected 'dark' to be 'light' // Object.is equality
 FAIL  tests/unit/preferences.test.js > theme preference > stores light and dark plain under todos.theme, which the vendored theme-boot.js reads
AssertionError: expected '"dark"' to be 'dark' // Object.is equality
 FAIL  tests/unit/preferences.test.js > theme preference > removes todos.theme for system, so theme-boot.js leaves the page on the system theme
AssertionError: expected true to be false // Object.is equality
 Test Files  2 failed (2)
      Tests  3 failed | 57 passed (60)
```

Command: `npx playwright test tests/e2e/theme-boot.spec.js` (exit code 1, filtered to results)

```text
  ✘  2 [chromium] › tests\e2e\theme-boot.spec.js:26:3 › a stored light theme applies before the app module runs (6.8s)
  ✘  4 [chromium] › tests\e2e\theme-boot.spec.js:41:1 › choosing a theme in Settings stores it plain and keeps the color-scheme meta in step (7.0s)
  ✘  1 [chromium] › tests\e2e\theme-boot.spec.js:35:1 › without a stored theme the page follows the system theme (7.1s)
  ✘  3 [chromium] › tests\e2e\theme-boot.spec.js:26:3 › a stored dark theme applies before the app module runs (7.3s)
    Error: expect(locator).toHaveAttribute(expected) failed
    Expected: "dark"
           - unexpected value "null"
    Expected: "light dark"
    Error: element(s) not found
  4 failed
```

### Completion Check Passes
Command: `python scripts/devops.py check` (exit code 0)

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
OK: 158 precached files match VERSION 2026-11-24.10.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
 Test Files  68 passed (68)
      Tests  1819 passed (1819)
Command: "C:\Program Files\nodejs\npm.CMD" run lint
Command: "C:\Program Files\nodejs\npm.CMD" run test:e2e
[... 276 lines omitted ...]
  ✓  279 [chromium] › tests\e2e\theme-boot.spec.js:26:3 › a stored dark theme applies before the app module runs (1.9s)
  ✓  280 [chromium] › tests\e2e\theme-boot.spec.js:26:3 › a stored light theme applies before the app module runs (1.5s)
  ✓  282 [chromium] › tests\e2e\theme-boot.spec.js:41:1 › choosing a theme in Settings stores it plain and keeps the color-scheme meta in step (1.2s)
  ✓  281 [chromium] › tests\e2e\theme-boot.spec.js:35:1 › without a stored theme the page follows the system theme (1.4s)
  282 passed (3.7m)
Command: python.exe -m ruff check scripts tests
All checks passed!
Command: python.exe -m ruff format --check scripts tests
4 files already formatted
Command: python.exe -m pytest -q tests
215 passed in 113.69s (0:01:53)
```

The check ran before the `docs/specs/ui-design.md` and `CHANGELOG.md` edits, which no check reads.
