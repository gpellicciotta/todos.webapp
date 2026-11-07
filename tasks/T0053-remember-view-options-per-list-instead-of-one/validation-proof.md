## Walkthrough & Validation

### Tests failed before the implementation
```
npx vitest run tests/unit/view-controls.test.js tests/unit/list.test.js
 FAIL  ... per list > resets one list to the defaults and removes its entry ...
TypeError: model.select is not a function
 Test Files  2 failed (2)
      Tests  8 failed | 46 passed (54)
```

### Full unit suite after the implementation
```
npx vitest run
 Test Files  53 passed (53)
      Tests  1077 passed (1077)
```

### Lint, service worker check, e2e
```
npx eslint .                      -> no output, exit 0
npm run check:sw                  -> OK: 70 precached files match VERSION 2026-11-07.25.
npx playwright test tests/e2e/list.spec.js tests/e2e/lists.spec.js -> 21 passed
```
