## Walkthrough & Validation

Added the Shared only checkbox to the Lists screen sort menu (`src/js/views/lists.js`, `src/js/core/list-sort.js`).

### Before the code (failing)
Command: `npx vitest run tests/unit/lists.test.js` — exit code 1

```
 FAIL  ... the Shared only filter (LST-16) > keeps the sort next to the filter in the stored choice
TypeError: Cannot read properties of null (reading 'click')
 FAIL  ... the Shared only filter (LST-16) > locks reordering while the filter is on
AssertionError: expected …(13) to have a length of 2 but got 13
 Test Files  1 failed (1)
      Tests  4 failed | 26 passed (30)
```

### After the code
Command: `npx vitest run tests/unit/lists.test.js tests/unit/list-sort.test.js` — exit code 0

```
 Test Files  2 passed (2)
      Tests  47 passed (47)
```

Command: `npm test` — exit code 0

```
 Test Files  65 passed (65)
      Tests  1682 passed (1682)
```

Command: `npm run lint` — exit code 0

```
> todos-webapp@0.5.1-pre lint
> eslint .
```

Command: `npx playwright test tests/e2e/lists.spec.js` — exit code 0

```
  ok 10 [chromium] › tests\e2e\lists.spec.js:282:1 › connected with two shared lists, Shared only shows just those lists and survives a reload (LST-16) (2.5s)
  12 passed (10.3s)
```
