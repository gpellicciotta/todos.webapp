## Walkthrough & Validation

### Changes
- The list view options offer Group by None, Due date, and Status; List is left out.
- A grouped list view renders group headers, keeps the manual order inside groups, and hides the grips and moves.

### Tests failed first (filtered with grep for × lines)
```text
npx vitest run tests/unit/view-controls.test.js tests/unit/list.test.js
     × groups the rows by status, keeping the manual order inside each group, and hides the moves (LV-8, LV-11) 100ms
     × stores the grouping per device and reads only the groupings a view offers (TV-12, VO-9) 20ms
     × offers Group by with None, Due date, and Status in a list view, but not List (LV-11) 18ms
      Tests  3 failed | 43 passed (46)
```

### Tests pass after the change
```text
npx vitest run
 Test Files  38 passed (38)
      Tests  855 passed (855)

npx eslint .
(no output, exit 0)

npx playwright test --reporter=line
  159 passed (1.7m)

npm run check:sw
OK: 56 precached files match VERSION 2026-11-07.11.
```
