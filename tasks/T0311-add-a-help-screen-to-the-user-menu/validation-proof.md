## Walkthrough & Validation

Help screen at `#/help`, opened from the user menu; Settings lost Keyboard shortcuts and About.

### Red phase

Command: `npx vitest run tests/unit/markdown.test.js tests/unit/help.test.js tests/unit/router.test.js tests/unit/user-menu.test.js tests/unit/settings.test.js` (exit 1)

```text
 FAIL  tests/unit/help.test.js [ tests/unit/help.test.js ]
Error: Failed to resolve import "../../src/js/views/help.js" from "tests/unit/help.test.js". Does the file exist?
 FAIL  tests/unit/markdown.test.js [ tests/unit/markdown.test.js ]
Error: Failed to resolve import "../../src/js/ui/markdown.js" from "tests/unit/markdown.test.js". Does the file exist?
 FAIL  tests/unit/router.test.js > parseRoute and formatRoute > parses and formats #/help
 FAIL  tests/unit/settings.test.js > sections that moved to Help > keeps Appearance, Adding tasks, Reminders, Data, and Connection, with no Keyboard shortcuts or About section
 FAIL  tests/unit/settings.test.js > sections that moved to Help > shows no shortcut list, version line, add field syntax, or source link
 FAIL  tests/unit/user-menu.test.js > attachUserMenu in local mode > shows each item as a menu item with its icon from the look sprite
 FAIL  tests/unit/user-menu.test.js > attachUserMenu when connected > names the account and says Connected in the menu
 FAIL  tests/unit/user-menu.test.js > attachUserMenu when the session expired > keeps the account name, says Sign in needed, and keeps Recycle bin, Settings, and Help
 Test Files  5 failed (5)
      Tests  6 failed | 97 passed (103)
```

Command: `python -m pytest tests/test_draw_wireframes.py -q -x` (exit 1)

```text
tests\test_draw_wireframes.py:601: AssertionError
FAILED tests/test_draw_wireframes.py::test_user_panel_lists_the_state_recycle_bin_settings_and_help
1 failed, 172 passed in 0.95s
```

### Green phase

Command: `python scripts/devops.py check` (exit 0), final lines

```text
  294 passed (3.9m)
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff check scripts tests
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
271 passed in 101.34s (0:01:41)
```

The same check ran Vitest earlier in the run: 71 files and 1905 tests passed, in the last full Vitest run before the doc edits.

### Visual

Settings before and after, and Help, in light and dark at 390 and 1440 px, were captured; the full set of 20 captures sits in the `screenshots` folder of this task folder.
- Before: [settings-before.png](settings-before.png)
- After: [settings-after.png](settings-after.png)
- After: [help-after.png](help-after.png)

The capture run blocked service workers, so its only console errors were the expected "Service worker failed" messages that this causes.
No HTTP errors occurred.

### Notes

- The vendored `changelog-parser.mjs` is support.js commit `3747182`, whose `package.json` says version 3.1.0-pre; the spec said v4.0.1-pre, so the provenance comment names 3.1.0-pre.
- Undeclared files touched: `src/index.html` (module preload links), `src/js/ui/layout.js`, `tests/unit/layout.test.js`, `tests/e2e/shell.spec.js`, `scripts/sw-precache-hashes.json` (mechanical).

### Review round 1 rework: query links

The router now carries a hash query, and Help applies `?q=` and `?topic=`.

Command: `python scripts/devops.py check` (exit 0), key lines

```text
 Test Files  71 passed (71)
      Tests  1908 passed (1908)
  296 passed (3.7m)
271 passed in 108.11s (0:01:48)
```

