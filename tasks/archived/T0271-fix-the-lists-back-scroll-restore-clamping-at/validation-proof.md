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

## Review round 1 rework: cancel pending restore on navigation

The restore retries now run in the background, and any hashchange, user input, or `destroy` cancels them.

### Red: new router tests against the committed router (exit 1)
Command: `git show HEAD:src/js/ui/router.js > src/js/ui/router.js; npx vitest run tests/unit/router.test.js`
```
 ❯ tests/unit/router.test.js (31 tests | 2 failed) 10044ms
 FAIL  tests/unit/router.test.js > createRouter > keeps restoring a scroll the browser clamps while rows off screen grow the content
Error: Test timed out in 5000ms.
 FAIL  tests/unit/router.test.js > createRouter > renders a newer route at once while a clamped restore waits for frames that never run
```

### Green (exit 0)
```
npx vitest run tests/unit/router.test.js   -> Tests  31 passed (31)
npm run lint                               -> eslint . (no output)
npx vitest run                             -> Test Files 65 passed (65); Tests 1686 passed (1686)
npx playwright test tests/e2e/lists-many-rows.spec.js --repeat-each=10 --project=chromium -> 40 passed (3.1m)
npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js tests/e2e/long-list.spec.js --project=chromium -> 43 passed (35.8s)
```
