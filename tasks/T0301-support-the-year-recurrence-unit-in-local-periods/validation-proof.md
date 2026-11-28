## Walkthrough & Validation

Year vectors copied from todos.server (commit d2ec05f) into the fixture. periods.js now handles `year`; occurrences.js labels it Yearly.

Before implementation: `npx vitest run tests/unit/periods.test.js`, exit code 1.

```
 FAIL  tests/unit/periods.test.js > recurrence periods > passes the shared vector: year, local date behind the UTC date
RangeError: Not a recurrence rule: year, 1, America/New_York.
 Test Files  1 failed (1)
      Tests  12 failed | 37 passed (49)
```

After implementation: `npx vitest run tests/unit`, exit code 0.

```
 Test Files  69 passed (69)
      Tests  1879 passed (1879)
```

`npx eslint src/js/core tests/unit/periods.test.js` printed no findings.
