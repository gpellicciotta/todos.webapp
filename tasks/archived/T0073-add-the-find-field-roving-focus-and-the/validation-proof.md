## Walkthrough & Validation

Added the sidebar find field, filter, roving tabindex, `l` shortcut, live announcement, and the Settings shortcut row.

### Red run before the code

Command: `npx vitest run tests/unit/layout-find.test.js tests/unit/settings.test.js` (exit 1)

```
 ❯ tests/unit/layout-find.test.js (17 tests | 16 failed)
 ❯ tests/unit/settings.test.js (44 tests | 1 failed)
 Test Files  2 failed (2)
      Tests  17 failed | 44 passed (61)
```

Command: `npx playwright test tests/e2e/sidebar-find.spec.js` (exit 1)

```
  4 failed
    [chromium] › tests\e2e\sidebar-find.spec.js:29:1 › the find field filters the sidebar lists ...
    [chromium] › tests\e2e\sidebar-find.spec.js:43:1 › Down moves into the rows ...
    [chromium] › tests\e2e\sidebar-find.spec.js:58:1 › l focuses the find field ...
    [chromium] › tests\e2e\sidebar-find.spec.js:68:1 › no find field shows below 12 lists ...
```

### Green run after the code

Command: `npm test` (exit 0)

```
 Test Files  63 passed (63)
      Tests  1647 passed (1647)
```

Command: `npm run lint` (exit 0)

```
> todos-webapp@0.5.1-pre lint
> eslint .
```

Command: `npx playwright test tests/e2e/sidebar-find.spec.js tests/e2e/shell.spec.js tests/e2e/lists.spec.js tests/e2e/gallery-chrome.spec.js` (exit 0)

```
  ok 56 [chromium] › tests\e2e\sidebar-find.spec.js:29:1 › the find field filters the sidebar lists, counts matches, and opens the first one on Enter (4.4s)

  59 passed (37.1s)
```

### Round 1 rework: l opens Lists without a field

Command: `npm test`, `npm run lint`, `npx playwright test tests/e2e/sidebar-find.spec.js tests/e2e/shell.spec.js` (exit 0)

```
 Test Files  63 passed (63)
      Tests  1647 passed (1647)
  32 passed (20.8s)
```
