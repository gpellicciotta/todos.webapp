# Walkthrough & Validation

The null box was not reproduced locally; it comes from T0237's proof under full parallel load.

```text
> npx playwright test tests/e2e/shell.spec.js --repeat-each 10
  260 passed (2.4m)
> npx playwright test
  224 passed (2.3m)
```
