## Walkthrough & Validation

Added the Reminders section to settings.svg (also used by import.svg), clipped at the frame edge; added a real-notification spec.

### Wireframe tests
Command: `python scripts/devops.py test tests/test_draw_wireframes.py` (exit 0)
```
Command: python.exe -m pytest -q tests/test_draw_wireframes.py
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed in 0.69s
```

### Real notifications in Chrome and Firefox
Command: `npx playwright test --config playwright.browsers.config.js` (exit 0)
```
Running 2 tests using 2 workers
  ok 2 [chrome] › tests\e2e\reminders-real.spec.js:8:1 › a due task raises a real notification that the registration lists (3.6s)
  ok 1 [firefox] › tests\e2e\reminders-real.spec.js:8:1 › a due task raises a real notification that the registration lists (4.3s)
  2 passed (8.1s)
```
The spec asserts `registration.getNotifications()` lists the task. It cannot see the OS toast. The headless Chromium shell denies notifications, so Chrome itself runs.

### Lint
Command: `npx eslint .` (exit 0, no output)
