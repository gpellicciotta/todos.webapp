---
id: T0226
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0226: Notify the user when a task comes due while the app is open, with opt-in and a lead time

## Goals
Alert the user when an open task comes due, in both modes, while the app is open in any tab.
- Settings gain an opt-in Reminders section that requests notification permission and offers a lead time.
- One tab schedules notifications through the service worker; clicking one opens the task editor.
- Each due time notifies once; edits re-arm it, and completing or deleting a task cancels it.
- Local mode still sends no network request (`LOC-3`).
- Reminders with the app closed follow in T0227.
- Motivation: [comparing-with-google-products.md](https://github.com/gpellicciotta/todos.server/blob/main/docs/comparing-with-google-products.md), section Reminders, Dates, and Calendar.

Completion check: `npm run test:unit` and the new reminders e2e spec pass.
Size estimate: 8 files, 350 lines.

## Task Execution Steps
- [ ] **[Read]**      Read the preferences, settings, service worker, overdue, and tab coordination code.
- [ ] **[Decide]**    Decide the date-only reminder time and how reminders missed while closed appear on start.
- [ ] **[Implement]** Author failing unit tests for scheduling and an e2e spec with a mocked Notification API.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the reminder scheduler, the Settings section, and the notification click handler.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Inspect the Settings section and a real notification in Chrome and Firefox on desktop.
- [ ] **[Doc]**       Add reminder requirements, the Settings design, the wireframe, and a CHANGELOG.md entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.
