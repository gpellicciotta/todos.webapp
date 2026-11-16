---
id: T0227
owner: ~
needs: ['T0226']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the service's push routes in its REST API spec and the T0226 reminder code.
- [ ] **[Implement]** Author failing unit tests for subscribe, unregister, push display, and deduplication.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the subscription client, the worker push handler, and the Settings state.
- [ ] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [ ] **[Visual]**    Inspect a pushed reminder on desktop Chrome and on an installed PWA on Android.
- [ ] **[Doc]**       Update the requirements, the Settings design, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.

- [2026-11-16] **[Doc]**
  Kept in Backlog: todos.server still has no push routes or sender. Replaced the missing test:unit script with npm test.

- [2026-11-16] **[Doc]**
  Named todos.server T0260 and T0261 as the blocking service work, with their planned routes, payload, and tag.
