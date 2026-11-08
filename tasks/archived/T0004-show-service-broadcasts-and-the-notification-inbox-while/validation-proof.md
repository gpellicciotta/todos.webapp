## Walkthrough & Validation

### Red: new unit tests fail before implementation
Command: `npx vitest run tests/unit/inbox.test.js tests/unit/inbox-ui.test.js` (exit code 1)

```text
Error: Failed to resolve import "../../src/js/sync/inbox.js" from "tests/unit/inbox.test.js". Does the file exist?
 Test Files  2 failed (2)
      Tests  no tests
```

### Green: unit tests, lint, service worker version
Commands: `npx vitest run`, `npx eslint .`, `npm run check:sw` (all exit code 0)

```text
### Green: unit tests
 Test Files  41 passed (41)
      Tests  911 passed (911)
exit: 0
### Lint
exit: 0
### SW version
OK: 59 precached files match VERSION 2026-11-07.14.
```

### Green: end-to-end tests
Command: `npx playwright test` (exit code 0)

```text
  169 passed (1.7m)
```

New end-to-end file: `tests/e2e/inbox.spec.js` (5 tests, all passed). Two existing specs (`connect.spec.js`, `shell.spec.js`) now mock the inbox endpoint, since a connected session loads the inbox.

### Visual verification
Light wide and dark compact screenshots, with zero console errors, page errors, and responses of 400 or higher:
- [before-wide-light.png](before-wide-light.png), [after-wide-light-banner.png](after-wide-light-banner.png), [after-wide-light-panel.png](after-wide-light-panel.png)
- [before-compact-dark.png](before-compact-dark.png), [after-compact-dark-banner.png](after-compact-dark-banner.png), [after-compact-dark-panel.png](after-compact-dark-panel.png)
