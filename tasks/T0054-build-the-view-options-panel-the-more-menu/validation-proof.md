# T0054 validation proof

## Failing tests before implementation (TDD)

`npx vitest run tests/unit` (summary, exit 1):

```text
      1       Tests  44 failed | 736 passed (780)
      1  Test Files  4 failed | 33 passed (37)
      2 TypeError: createInfoLine is not a function
      1 TypeError: createSearchField is not a function
     11 TypeError: createViewModel is not a function
      5 TypeError: describeInfoLine is not a function
      1 TypeError: isDefaultViewState is not a function
```

`npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js --timeout=8000` (summary, exit 1):

```text
12 failed
10 passed (43.6s)
```

The 12 failures are the new view options, More menu, and info line tests; the failure reason is the missing controls and routes.
