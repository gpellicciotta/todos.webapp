---
id: T0004
owner: "@claude"
session: claude-20261107-cc72a5
needs: []
branch: task/T0004-show-service-broadcasts-and-the-notification-inbox-while
worktree: .plan/work/T0004-show-service-broadcasts-and-the-notification-inbox-while
status: active
started_at: "2026-11-07T18:55:40Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0004: Show service broadcasts and the notification inbox while connected

## Goals
Show service broadcasts and the notification inbox while connected.

## Task Execution Steps
- [x] **[Implement]** Author failing unit tests for the inbox client and the inbox view.
- [x] **[Verify]**    Run the new unit tests and record that they fail.
- [x] **[Implement]** Implement the inbox client, the bell and banners, the wiring, and the styles.
- [x] **[Implement]** Author the end-to-end test against a mocked service.
- [x] **[Verify]**    Run unit tests, lint, and end-to-end tests; record the output.
- [x] **[Doc]**       Update requirements, UI design, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-03] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Implement]**
  Built the inbox client, bell, panel, and broadcast banners, wired into the shell.
  - Used the todos REST API notifications endpoints.

- [2026-11-07] **[Verify]**
  Unit, lint, and end-to-end suites pass; screenshots stored in the companion folder.
  - 911 unit tests, 169 e2e tests.

- [2026-11-07] **[Doc]**
  Added NTF-1 to NTF-7, the Inbox design, and changelog bullets.

- [2026-11-07] **[Doc]**
  Size note: about 19 files and 1500 lines, above the large line but under 3x the estimate; one feature, not splittable. Mechanical: node scripts/check-sw-version.mjs --update.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 20.
  - Lines touched: 1500.
  - Reopenings: 0.

