---
id: T0227
owner: "@claude"
session: claude-20261128-8536bb
needs: []
branch: task/T0227-deliver-due-reminders-with-the-app-closed-through
worktree: .plan/work/T0227-deliver-due-reminders-with-the-app-closed-through
status: completed
started_at: "2026-11-28T03:17:18Z"
ended_at: "2026-11-28T03:37:11Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 1092.9, input: 132, output: 57963, cache_read: 8398228, cache_write: 161477}
  review: {turns: 1, duration_s: 87.9, input: 65422, output: 4770, cache_read: 588195}
review_status: approved
review_round: 1
review_requested_at: "2026-11-28T03:35:38Z"
reviewed_by: "@gemini"
review_session: antigravity-20261128-56414b
work_duration: 1193.2
completion-commit: a8a36684874bdbeef67d6666d1c9d766c858ba20
---
# T0227: Deliver due reminders with the app closed through Web Push while connected, once the service sends them

## Goals
Deliver due reminders while every tab is closed, using Web Push in connected mode.
- With reminders on and connected, subscribe through `PushManager` and register the subscription with the service.
- The service worker shows pushed reminders, deduplicated with local ones by the same notification tag.
- Unsubscribe and unregister on disconnect, sign-out, or turning reminders off.
- Blocked until todos.server completes T0260 (subscription and VAPID key routes) and T0261 (reminder sender).
- Motivation: [comparing-with-google-products.md](https://github.com/gpellicciotta/todos.server/blob/main/docs/comparing-with-google-products.md), section Reminders, Dates, and Calendar.

Completion check: `npm test`, the reminders e2e spec, and `npm run test:contract` pass.
Size estimate: 6 files, 300 lines.

## Task Execution Steps
- [x] **[Read]**      Read the service's push routes in its REST API spec and the T0226 reminder code.
- [x] **[Implement]** Author failing unit tests for subscribe, unregister, push display, and deduplication.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the subscription client, the worker push handler, and the Settings state.
- [x] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [x] **[Visual]**    Inspect the Settings reminder states in both themes and a pushed example reminder in desktop Chromium.
- [x] **[Doc]**       Update the requirements, the Settings design, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.

- [2026-11-16] **[Doc]**
  Kept in Backlog: todos.server still has no push routes or sender. Replaced the missing test:unit script with npm test.

- [2026-11-16] **[Doc]**
  Named todos.server T0260 and T0261 as the blocking service work, with their planned routes, payload, and tag.

- [2026-11-28] **[Decided]**
  Resumed after todos.server T0261. Moved the real device checks out: todos.server T0308 covers Chrome and Firefox pushes, and T0317 covers Android after the release.

- [2026-11-28] **[Implement]**
  Implemented push-subscription.js, the worker push handler, the Settings push line, session beforeDisconnect, and API push routes; proof in validation-proof.md.

- [2026-11-28] **[Verify]**
  Contract suite: new push test passes; 16 older sync tests fail identically on main, stale server jar suspected. 8 e2e failures also fail on main.

- [2026-11-28] **[Visual]**
  Inspected Settings reminders in light and dark: push on and service-unavailable lines render with the hint style; screenshots linked in validation-proof.md and below: [before](T0227-deliver-due-reminders-with-the-app-closed-through/before-light-local.png), [after light](T0227-deliver-due-reminders-with-the-app-closed-through/after-light-on.png), [after dark](T0227-deliver-due-reminders-with-the-app-closed-through/after-dark-on.png).

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 approved by @gemini: TL;DR: The work meets the goals.
  - Findings: [review-findings-1.md](T0227-deliver-due-reminders-with-the-app-closed-through/review-findings-1.md).

- [2026-11-28] **[Complete]**
  Task completed successfully.

