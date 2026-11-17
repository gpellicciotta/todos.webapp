# Validation proof

## Before the fix

```text
> npx vitest run tests/unit/all-tasks.test.js
 ❯ tests/unit/all-tasks.test.js:349:22
    349|     expect(show).not.toHaveBeenCalled();
 Test Files  1 failed (1)
      Tests  1 failed | 30 passed (31)

> npx playwright test tests/e2e/all-tasks.spec.js -g "deleted list"   (old all-tasks.js)
    Error: expect(locator).toHaveCount(expected) failed
    Received: 1
  1 failed
```

## After the fix

```text
> npm test
 Test Files  60 passed (60)
      Tests  1585 passed (1585)

> npm run lint
> eslint .

> npx playwright test tests/e2e/all-tasks.spec.js
  30 passed (24.3s)
```

## Notes
- The unit test sits in `tests/unit/all-tasks.test.js`, not `add-bar.test.js`, since the pruning lives in the view.
- The e2e test deletes the list through the store, then remounts the view via `#/settings` and `#/`.
