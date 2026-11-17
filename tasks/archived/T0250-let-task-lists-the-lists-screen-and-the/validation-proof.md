# Validation proof
- Failing first: new shell e2e check failed with 'Expected: > 720, Received: 720' on All tasks.
- After the change: npx playwright test tests/e2e/shell.spec.js -> 26 passed.
- npm test -> Test Files 61 passed (61), Tests 1515 passed (1515).
- npx playwright test -> 219 passed.
```text
Round 2 (exit 0 each):
node scripts/check-sw-version.mjs --update -> OK: wrote 130 hashes for VERSION 2026-11-17.5
npm run check:sw -> OK: 130 precached files match VERSION 2026-11-17.5.
npm run lint -> eslint . (no output)
npm test -> Test Files 61 passed (61), Tests 1515 passed (1515)
npx playwright test -> 219 passed
Round 1 failing-first: Expected: > 720  Received: 720
```

## Screenshots
- Before is the 45rem cap re-applied by an injected style; after is the shipped CSS. Widths 1024, 1440, 1920; tasks view and tasks view with the View options panel open.

- [before tasks 1024 px](screenshots/before-tasks-1024.png) / [after tasks 1024 px](screenshots/after-tasks-1024.png)
- [before editor 1024 px](screenshots/before-editor-1024.png) / [after editor 1024 px](screenshots/after-editor-1024.png)
- [before tasks 1440 px](screenshots/before-tasks-1440.png) / [after tasks 1440 px](screenshots/after-tasks-1440.png)
- [before editor 1440 px](screenshots/before-editor-1440.png) / [after editor 1440 px](screenshots/after-editor-1440.png)
- [before tasks 1920 px](screenshots/before-tasks-1920.png) / [after tasks 1920 px](screenshots/after-tasks-1920.png)
- [before editor 1920 px](screenshots/before-editor-1920.png) / [after editor 1920 px](screenshots/after-editor-1920.png)
