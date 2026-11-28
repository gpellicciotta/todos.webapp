# Validation proof

## Failing first
```text
> npx vitest run tests/unit/occurrences.test.js
 FAIL  tests/unit/occurrences.test.js > the log fold > folds the legacy events in place with the new verdicts
 TypeError: foldInPlace is not a function
 FAIL  ... > the log fold > keeps a carried reading from completing an open occurrence
 TypeError: foldLog is not a function
```

## Passing
```text
> npx vitest run tests/unit/occurrences.test.js
 Test Files  1 passed (1)
      Tests  38 passed (38)
> npx vitest run
 Test Files  68 passed (68)
      Tests  1830 passed (1830)
> npx eslint .
 (no output: no problems)
```

