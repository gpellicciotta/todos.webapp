## Walkthrough & Validation

Status tab built: progress box, Check off, stepper, Mark started, Reopen, previous period, Log form, entries with Undo, history lines.
Rules live in `src/js/core/progress.js`.

### Red state before implementation
Command: `npx vitest run tests/unit/task-editor.test.js` (exit 1)

```
 ❯ tests/unit/task-editor.test.js (113 tests | 28 failed)
```

Command: `npx playwright test tests/e2e/task-editor.spec.js -g "logs kcal|stepper steps"` (exit 1)

```
  2 failed
    [chromium] › tests\e2e\task-editor.spec.js:323:1 › the stepper steps a target-3 task up to 2 and back to 0 ...
    [chromium] › tests\e2e\task-editor.spec.js:364:1 › logs kcal past an at-most limit, sees the orange box ...
```

### Green state
Command: `npx vitest run` (exit 0)

```
 Test Files  73 passed (73)
      Tests  2099 passed (2099)
```

Command: `npx playwright test` (exit 0)

```
  300 passed (4.3m)
```

Command: `npx eslint .` (exit 0, no output)

Command: `npm run check:sw` (exit 0)

```
OK: 166 precached files match VERSION 2026-11-28.11.
```

### Screenshots
- Before: [light](task-editor-status-before-light.png), [dark](task-editor-status-before-dark.png)
- After: [light](task-editor-status-after-light.png), [dark](task-editor-status-after-dark.png)

### Review round 1 rework: previous period while cancelled
Command: `npx vitest run` (exit 0)

```
      Tests  2100 passed (2100)
```

Command: `npx playwright test tests/e2e/task-editor.spec.js` (exit 0)

```
  17 passed (22.6s)
```

Command: `npm run check:sw` (exit 0)

```
OK: 166 precached files match VERSION 2026-11-28.12.
```
