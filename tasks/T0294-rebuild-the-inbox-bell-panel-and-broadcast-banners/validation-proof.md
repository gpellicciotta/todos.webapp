## Walkthrough & Validation

### Red Phase: Updated Tests on the Unchanged View
Command: `npx vitest run tests/unit/inbox-ui.test.js tests/unit/layout.test.js` (exit code 1)

```text
⎯⎯⎯⎯⎯⎯ Failed Tests 26 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/inbox-ui.test.js > inbox button > shows the package bell named Inbox with the unread count while connected
 FAIL  tests/unit/inbox-ui.test.js > inbox button > shows no badge once everything is read
 FAIL  tests/unit/inbox-ui.test.js > inbox button > caps the badge at 99+ and keeps the full count in the name
 FAIL  tests/unit/inbox-ui.test.js > inbox button > is hidden in local mode
 FAIL  tests/unit/inbox-ui.test.js > inbox button > hides when the session expires
 FAIL  tests/unit/inbox-ui.test.js > inbox button > opens the panel
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > lists the notifications most recent first, unread ones marked, Mark read only on those
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > says so when the inbox is empty, with Clear all disabled
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > marks a notification read from its button
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > discards a notification from its button
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > discards everything with Clear all
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > marks the selected notifications read, one request each, and clears the selection
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > discards the selected notifications
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > shows a toast and keeps the row when an action fails
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > shows one toast when a bulk action fails
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > notes that it shows the last inbox while the service is unreachable
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > opens a safe action link in a new tab, and shows no link for an unsafe one
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > renders service text as text, never as markup
 FAIL  tests/unit/inbox-ui.test.js > inbox panel > keeps focus in the panel when the focused row goes away
 FAIL  tests/unit/inbox-ui.test.js > broadcast banners > shows the unread banner notification above the views with its title and message
 FAIL  tests/unit/inbox-ui.test.js > broadcast banners > shows the most severe banner first, with a link that opens the inbox for the rest
 FAIL  tests/unit/inbox-ui.test.js > broadcast banners > marks the notification read when the banner is dismissed
 FAIL  tests/unit/inbox-ui.test.js > broadcast banners > keeps the banner and shows a toast when the dismissal fails
 FAIL  tests/unit/inbox-ui.test.js > broadcast banners > names the Dismiss button
 FAIL  tests/unit/inbox-ui.test.js > broadcast banners > opens a safe banner link in a new tab
 FAIL  tests/unit/layout.test.js > renderShell inbox > puts the bell before the user button, and keeps the top bar at the nav toggle, a title, and one menu slot
 Test Files  2 failed (2)
      Tests  26 failed | 36 passed (62)
```

Command: `npx playwright test tests/e2e/inbox.spec.js` (exit code 1)
The two local-mode guards pass on main too: the old bell lacks the package class, so it counts as hidden.

```text
  ✓  2 [chromium] › tests\e2e\inbox.spec.js:125:1 › local mode shows no bell and sends no request to the service (2.6s)
  ✓  5 [chromium] › tests\e2e\inbox.spec.js:133:1 › an expired session shows no bell and sends no request (1.1s)
  ✘  4 [chromium] › tests\e2e\inbox.spec.js:110:1 › a broadcast with a banner shows above the view until it is dismissed (7.0s)
  ✘  1 [chromium] › tests\e2e\inbox.spec.js:74:1 › a connected app shows the bell with the unread count, and the panel lists the notifications (7.3s)
  ✘  3 [chromium] › tests\e2e\inbox.spec.js:90:1 › mark read, discard, bulk mark read, and clear all change the inbox and the badge (30.2s)
    Error: expect(locator).toHaveText(expected) failed
    Error: expect(locator).toContainText(expected) failed
  3 failed
  2 passed (32.2s)
```

### Completion Check on the Final Tree
Command: `python scripts/devops.py check` (exit code 0)
The first run failed 10 e2e tests: the closed panel kept a `.view-header` and an `.empty-state` in the page.
The view now attaches the package inbox to the panel only while it is open.

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
OK: 157 precached files match VERSION 2026-11-24.6.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
> todos-webapp@0.5.1-pre test
> vitest run
 Test Files  68 passed (68)
      Tests  1808 passed (1808)
[... e2e list of 276 tests omitted ...]
  276 passed (3.6m)
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff check scripts tests
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
215 passed in 112.14s (0:01:52)
```

### Visual Verification
A temporary Playwright spec, kept out of the repository, captured the open panel and the banner.
It ran connected against a mocked inbox of three notifications, one a warning banner.
It failed on any console error, page error, or HTTP status of 400 or higher; every run passed.

Command: `SHOTS_PREFIX=before|after npx playwright test zz-t0294-shots` (exit code 0 both times)

```text
  ✓  1 [chromium] › tests\e2e\zz-t0294-shots.spec.js:16:5 › inbox 390 light (3.1s)
  ✓  4 [chromium] › tests\e2e\zz-t0294-shots.spec.js:16:5 › inbox 390 dark (3.4s)
  ✓  3 [chromium] › tests\e2e\zz-t0294-shots.spec.js:16:5 › inbox 1440 dark (3.3s)
  ✓  2 [chromium] › tests\e2e\zz-t0294-shots.spec.js:16:5 › inbox 1440 light (4.0s)
  4 passed (5.6s)
```

| Viewport | Before                                         | After                                        |
| :------- | :--------------------------------------------- | :------------------------------------------- |
| 390 px   | [light](before-390-light.png), [dark](before-390-dark.png)   | [light](after-390-light.png), [dark](after-390-dark.png)   |
| 1440 px  | [light](before-1440-light.png), [dark](before-1440-dark.png) | [light](after-1440-light.png), [dark](after-1440-dark.png) |

- After: package rows with type and Unread badges, relative time chips, checkboxes, and the unread summary.
- After: the banner takes the warning variant with a Dismiss icon button; the bell badge takes the danger ground.
