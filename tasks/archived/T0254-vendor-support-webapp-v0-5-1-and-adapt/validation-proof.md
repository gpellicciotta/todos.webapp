## Walkthrough & Validation

Vendored support.webapp v0.5.1 (LF `git archive`), updated the app sprite, precache, and tests.

### Red phase: unit tests after vendoring, before adapting

Command: `npx vitest run` (exit 1)

```text
 FAIL  tests/unit/design-system.test.js > ... > is pinned by design.json to release 0.2.1 with the neutral look
 FAIL  tests/unit/layout.test.js > renderShell navigation toggle and rail > opens the top bar with the nav toggle ...
AssertionError: expected 'img/icons.svg#icon-nav-collapse' to be 'img/icons.svg#nav-menu'
 FAIL  tests/unit/modulepreload.test.js > ... preloads every module of the app and the vendored modules it loads ...
 FAIL  tests/unit/precache.test.js > service worker precache > lists every file the app needs under src/, except the gallery
 Test Files  4 failed | 63 passed (67)
      Tests  4 failed | 1781 passed (1785)
```

### Green phase: completion check

Command: `python scripts/devops.py check` (exit 0)

```text
 Test Files  67 passed (67)
      Tests  1786 passed (1786)
[... e2e lines omitted ...]
  275 passed (3.5m)
All checks passed!
190 passed in 99.37s (0:01:39)
```

The first check run failed one e2e test, `gallery-app.spec.js:167`, on `../img/icons.svg#nav-menu` in the gallery; renaming it to `icon-nav-menu` fixed it.

### Screenshots

Before is main (0.2.1), after is this branch, at 390 and 1440 px, light and dark, for Tasks, Lists, and Settings.
A pixel diff of all 12 pairs shows only the nav toggle glyph (x 29-38, y 29-37) at 1440 px, plus 1 to 12 antialiasing pixels.
All 390 px pairs match exactly. No console errors or page errors in any capture.

- [before tasks 1440 light](screenshots/before-tasks-1440-light.png), [after](screenshots/after-tasks-1440-light.png)
- [before tasks 390 dark](screenshots/before-tasks-390-dark.png), [after](screenshots/after-tasks-390-dark.png)
