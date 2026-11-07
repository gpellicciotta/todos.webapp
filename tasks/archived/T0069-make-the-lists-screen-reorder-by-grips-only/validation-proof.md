## Walkthrough & Validation

### Changes
- Lists rows lose Move up and Move down; each row gains a More button with the List screen menu.
- Grips show on touch screens too; Alt+Up and Alt+Down still reorder.

### Tests failed first (filtered with grep for × lines)
```text
npx vitest run tests/unit/lists.test.js
     × gives each row a drag handle and a More button, and no Move up or Move down buttons 16ms
     × holds Edit list, Edit view options, Share list, and Delete list in the More menu of a row (VO-4) 4ms
     × opens the list editor, the view options, and the sharing section of the row list from its More menu 4ms
     × asks before Delete list, and moves the list to the recycle bin once confirmed 5ms
     × does not open the list when the More button is used 4ms
      Tests  5 failed | 7 passed (12)
```

### Tests pass after the change
```text
npx vitest run
 Test Files  38 passed (38)
      Tests  857 passed (857)

npx eslint .
(no output, exit 0)

npx playwright test --reporter=line
  160 passed (1.7m)

npm run check:sw
OK: 57 precached files match VERSION 2026-11-07.12.
```

### Screenshots
Captured with a temporary Playwright spec (not committed): zero console errors, page errors, failed requests, or HTTP 400+.
- Before: [wide light](lists-before-light-wide.png), [wide dark](lists-before-dark-wide.png), [compact light](lists-before-light-compact.png), [compact dark](lists-before-dark-compact.png)
- After: [wide light](lists-after-light-wide.png), [wide dark](lists-after-dark-wide.png), [compact light](lists-after-light-compact.png), [compact dark](lists-after-dark-compact.png)
- After, menu open: [wide light](lists-after-menu-light-wide.png), [wide dark](lists-after-menu-dark-wide.png), [compact light](lists-after-menu-light-compact.png), [compact dark](lists-after-menu-dark-compact.png)
