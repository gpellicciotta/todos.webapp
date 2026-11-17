## Walkthrough & Validation

The header button moves each view's menu beside the user button from 64rem.

Failing run before the implementation (`npx vitest run tests/unit/layout.test.js tests/unit/all-tasks.test.js tests/unit/list.test.js`), exit code 1:

```
 Test Files  3 failed (3)
      Tests  7 failed | 62 passed (69)
```

Unit suite after the implementation (`npx vitest run`), exit code 0:

```
 Test Files  61 passed (61)
      Tests  1515 passed (1515)
```

End-to-end suite (`npx playwright test`), exit code 0:

```
  218 passed (2.6m)
```

Other checks, all exit code 0:

```
npx eslint .                         (no output)
python -m pytest -q                  156 passed in 124.30s
node scripts/check-sw-version.mjs    OK: 130 precached files match VERSION 2026-11-17.4.
```

Screenshots in this directory, light and dark, at 1440 px and 390 px:
- [All tasks, desktop](after-all-tasks-desktop-light.png), [dark](after-all-tasks-desktop-dark.png)
- [All tasks menu, desktop](after-all-tasks-menu-desktop-light.png), [dark](after-all-tasks-menu-desktop-dark.png)
- [List menu, desktop](after-list-menu-desktop-light.png), [dark](after-list-menu-desktop-dark.png)
- [All tasks, phone](after-all-tasks-phone-light.png), [dark](after-all-tasks-phone-dark.png)
- [All tasks menu, phone](after-all-tasks-menu-phone-light.png), [dark](after-all-tasks-menu-phone-dark.png)
- [List menu, phone](after-list-menu-phone-light.png), [dark](after-list-menu-phone-dark.png)
