## Walkthrough & Validation

Root cause: unrendered rows counted at 64 px (`contain-intrinsic-size`) while rows render at 48 px, so Back clamped at 10958 px.

### Red: unit test against the old router (exit 1)
```
FAIL  tests/unit/router.test.js > createRouter > keeps restoring a scroll the browser clamps while rows off screen grow the content
AssertionError: expected 100 to be 450 // Object.is equality
```

### Unit suite (exit 0)
```
npx vitest run
 Test Files  65 passed (65)
      Tests  1685 passed (1685)
```

### Retry fix alone, e2e (exit 1, root cause not yet fixed)
```
npx playwright test tests/e2e/lists-many-rows.spec.js -g "Back from" --repeat-each=10
    Received:   10958
  6 failed
  4 passed
```

### With the 48 px intrinsic size, e2e (exit 0)
```
npx playwright test tests/e2e/lists-many-rows.spec.js --repeat-each=10 --project=chromium
  40 passed (3.0m)
npx playwright test tests/e2e/lists.spec.js tests/e2e/lists-find.spec.js tests/e2e/shell.spec.js --project=chromium
  44 passed (30.3s)
```
