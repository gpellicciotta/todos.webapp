# Validation proof
- Failing first: new shell e2e check failed with 'Expected: > 720, Received: 720' on All tasks.
- After the change: npx playwright test tests/e2e/shell.spec.js -> 26 passed.
- npm test -> Test Files 61 passed (61), Tests 1515 passed (1515).
- npx playwright test -> 219 passed.
```text
shell e2e (new check, before change): Expected: > 720  Received: 720
shell e2e (after change): 26 passed
npm test: Test Files 61 passed (61), Tests 1515 passed (1515)
npx playwright test: 219 passed
```

## Screenshots
- Before is the 45rem cap re-applied by an injected style; after is the shipped CSS. Widths 1024, 1440, 1920; tasks view and tasks view with the View options panel open.

- [before tasks 1024 px](screenshots/before-tasks-1024.png) / [after tasks 1024 px](screenshots/after-tasks-1024.png)
- [before editor 1024 px](screenshots/before-editor-1024.png) / [after editor 1024 px](screenshots/after-editor-1024.png)
- [before tasks 1440 px](screenshots/before-tasks-1440.png) / [after tasks 1440 px](screenshots/after-tasks-1440.png)
- [before editor 1440 px](screenshots/before-editor-1440.png) / [after editor 1440 px](screenshots/after-editor-1440.png)
- [before tasks 1920 px](screenshots/before-tasks-1920.png) / [after tasks 1920 px](screenshots/after-tasks-1920.png)
- [before editor 1920 px](screenshots/before-editor-1920.png) / [after editor 1920 px](screenshots/after-editor-1920.png)
