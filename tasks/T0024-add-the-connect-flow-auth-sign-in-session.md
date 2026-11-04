---
id: T0024
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T20:50:57Z"
ended_at: "2026-11-04T21:26:26Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 47fe3788adb1ec1c2c3362e6337716e84a3d1db5
---
# T0024: Add the connect flow: Auth sign-in, session token handling, server URL setting, and disconnect

## Goals
Build the connect screen per docs/specs/ui-design.md, signing in through the Auth service (`CON-1` to `CON-3`).
Store the session token, handle expiry without blocking local work, and delete it on disconnect (`CON-13`, `TEC-18`).
Make the server URL changeable only while disconnected (`CON-11`, `CON-12`).
Implement disconnect with the pending-changes warning; data adoption and sync come with the sync tasks.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Connecting section, ui-design.md's connect flows, and the Auth service integration notes.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the session module and the connect screen, and wire Connect and Disconnect in Settings.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [x] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-04] **[Read]**
  Traced the Auth contract through the Auth web API, the legacy SPA, support.js, and the ToDo's callback; four open service points remain.

- [2026-11-04] **[Verify]**
  Red phase: the unit suite fails on the missing auth module; seven connect and settings end-to-end tests fail, four settings tests pass.

- [2026-11-04] **[Implement]**
  Built auth.js, session.js, and the connect screen; wired Connect, the connected card, and Disconnect in Settings; registered the route and precache entries.
  - Undeclared files: src/css/views.css and tests/e2e/shell.spec.js.
  - Declared list extended at start: auth.js, app.js, service-worker.js, docs.

- [2026-11-04] **[Verify]**
  npm test, eslint, check:sw, and the full Playwright suite pass: 574 unit and 109 end-to-end tests.

- [2026-11-04] **[Verify]**
  A cross-origin mock let a redirect follow-up reach todos.pellicciotta.com twice, with fake values; mocks now use the app origin.

- [2026-11-04] **[Visual]**
  Compared Settings and Connect at 390 and 1440 px in both themes; aligned the signed-in check icon with its text.
  - Before: [settings-390-light-before.png](T0024-add-the-connect-flow-auth-sign-in-session/screenshots/settings-390-light-before.png).
  - After: [connect-signed-in-390-light-after.png](T0024-add-the-connect-flow-auth-sign-in-session/screenshots/connect-signed-in-390-light-after.png).

- [2026-11-04] **[Doc]**
  Updated ui-design.md for the connect screen and connected card, and added Auth Integration to devops.md; CHANGELOG left to the coordinator.

- [2026-11-04] **[Decide]**
  Feedback Needed: production connect needs ToDo's CORS for the app origin, a JSON or 403-aware callback, and Auth accepting the return URL.

- [2026-11-04] **[Doc]**
  Size note: 1072 counted lines against a 400 estimate, over the 1000 large line but under three times the estimate.

- [2026-11-04] **[Verify]**
  Recorded task outcomes against base a994e12, excluding sw-precache-hashes.json.
  - Files touched: 13.
  - Lines touched: 1072.
  - Reopenings: 0.

- [2026-11-04] **[Implement]**
  Fixed round 1 findings: e2e network guard with proof test, http only for this machine, persisted expired-token removal, and a failed pending count toast.
  - Size: 1196 counted lines in 18 files, under the 1200 cap.
  - New files: network-guard.spec.js, settings.test.js; changed playwright.config.js, preferences.js.

- [2026-11-04] **[Review]**
  Round 1 approved with a high and a medium finding fixed before merge; round 2 approved the network guard and URL checks.

- [2026-11-04] **[Doc]**
  Process note: an early test version sent two GETs with fake values to the production service; all mocks are now same-origin and a guard blocks real hosts.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

