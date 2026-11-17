## Walkthrough & Validation

Declared files `app-shell.css` and `app-components.css` do not exist; the CSS change went into `src/css/app-chrome.css`.
Also touched: `tests/unit/list-counts-consumers.test.js` (zero count now shows nothing), `docs/specs/ui-design.md`, `CHANGELOG.md`.

### Before the code: new tests fail
Command: `npx vitest run tests/unit/layout.test.js tests/unit/list-counts-consumers.test.js` (exit 1)
```
 ❯ tests/unit/list-counts-consumers.test.js (3 tests | 2 failed)
 ❯ tests/unit/layout.test.js (27 tests | 7 failed)
 Test Files  2 failed (2)
      Tests  9 failed | 21 passed (30)
```

### After the code
Command: `npx vitest run tests/unit/layout.test.js tests/unit/list-counts-consumers.test.js` (exit 0)
```
 Test Files  2 passed (2)
      Tests  30 passed (30)
```

Command: `npx playwright test tests/e2e/shell.spec.js tests/e2e/lists.spec.js` (exit 0)
```
  38 passed (23.5s)
```

Command: `npm test` (exit 0)
```
 Test Files  62 passed (62)
      Tests  1630 passed (1630)
```

Command: `npm run lint` (exit 0)
```
> todos-webapp@0.5.1-pre lint
> eslint .
```
