# Validation proof T0075

## Failing before the code

Command: `npx vitest run tests/unit/lists-many-rows.test.js`

```text
 Test Files  1 failed (1)
      Tests  7 failed | 1 passed (8)
```

## Passing after the code

Command: `npx vitest run`

```text
 Test Files  64 passed (64)
      Tests  1670 passed (1670)
```

Command: `npm run lint`

```text
> todos-webapp@0.5.1-pre lint
> eslint .
```

Command: `npx playwright test tests/e2e/lists-many-rows.spec.js`

```text
  3 passed (14.0s)
```

Command: `npx playwright test`

```text
    [chromium] > tests\e2e\behaviors.spec.js:109:3 > popover behavior > keyboard alone opens the filter popover, sets a filter, and closes it
  1 failed
  241 passed (2.8m)
```

The failing test also fails on the base commit with these changes stashed (`4 passed`, `1 failed`), so it predates T0075.

Command: `npm run check:sw`

```text
OK: 130 precached files match VERSION 2026-11-17.17.
```
