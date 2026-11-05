## Walkthrough & Validation

Both tasks share one working tree, so the runs below cover both.

### Tests failed before the implementation
Command: `npx vitest run` (tests authored first), exit code 1.

```text
 Test Files  6 failed | 29 passed (35)
      Tests  53 failed | 656 passed (709)
```

### Unit tests and lint after the implementation
Commands: `npx vitest run` and `npx eslint .`, exit code 0 for both.

```text
 Test Files  35 passed (35)
      Tests  707 passed (707)
   Duration  11.53s (environment 68%, tests 21%, import 8%, worker 2%, transform 2%)
eslint exit 0
```

### End-to-end tests after the implementation
Command: `npx playwright test tests/e2e/gallery-app.spec.js tests/e2e/gallery-danger.spec.js`, exit code 0.
The full suite also passed earlier in the session (121 passed).

```text
  ok 25 [chromium] › tests\e2e\gallery-danger.spec.js:38:3 › Delete controls use the danger color, and other controls do not, in the dark theme (1.4s)
  ok 13 [chromium] › tests\e2e\gallery-app.spec.js:212:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 1440 px (15.0s)

  25 passed (23.5s)
```

### Screenshots
Light and dark theme, before and after:

- Status button: [before light](before-status-light.png), [after light](after-status-light.png), [before dark](before-status-dark.png), [after dark](after-status-dark.png)
- Task row: [before light](before-task-row-light.png), [after light](after-task-row-light.png), [before dark](before-task-row-dark.png), [after dark](after-task-row-dark.png)
