## Walkthrough & Validation

Failing run before implementation (`npx vitest run tests/unit/bin.test.js tests/unit/recycle-bin.test.js`), exit code 1:

```
 ❯ tests/unit/bin.test.js (42 tests | 8 failed) 173ms
 ❯ tests/unit/recycle-bin.test.js (31 tests | 11 failed) 4222ms
      Tests  19 failed | 54 passed (73)
```

Failures: `store.restoreEntries` and `store.purgeEntries` were undefined, and the toolbar had no Restore or Delete buttons.

Unit suite after implementation (`npx vitest run`), exit code 0:

```
 Test Files  61 passed (61)
      Tests  1560 passed (1560)
```

Lint (`npx eslint .`), exit code 0, no output.

Service worker check (`node scripts/check-sw-version.mjs`), exit code 0:

```
OK: 130 precached files match VERSION 2026-11-17.8.
```

E2E suite (`npx playwright test`), exit code 0:

```
  222 passed (3.5m)
```

An earlier full run reported 2 failed, 220 passed; the rerun passed all 222, so those two were load flakiness.

Screenshots: [toolbar light](filtered-toolbar-after-light.png), [toolbar dark](filtered-toolbar-after-dark.png), [question light](filtered-question-after-light.png), [question dark](filtered-question-after-dark.png).
