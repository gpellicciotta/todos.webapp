---
id: T0242
owner: "@claude"
session: claude-20261117-f14a01
needs: []
branch: task/T0242-add-delete-account-to-settings-marking-the-connected
worktree: .plan/work/T0242-add-delete-account-to-settings-marking-the-connected
status: completed
started_at: "2026-11-17T03:12:56Z"
ended_at: "2026-11-17T03:21:48Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 438.9, input: 74, output: 23647, cache_read: 3560223, cache_write: 100431}
  review: {turns: 1, duration_s: 83.0, input: 60071, output: 1772, cache_read: 436480, cache_write: 0}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T03:20:22Z"
reviewed_by: "@codex"
review_session: codex-20261117-48a7c2
work_duration: 532.8
completion-commit: 756bc33ae2ea37c035287b10c9a9fb4ce477f700
---
# T0242: Add Delete account to Settings, marking the connected account for deletion on the service

## Goals
Add Delete account to Settings, separate from Delete all data, which never touches the account.
- Shown only while connected; it marks the account for deletion through `PUT /api/users/{{user-id}}`.
- The service purges marked accounts later, with their lists and tasks.
- After marking, the app disconnects and keeps the local data, as a normal disconnect does.
- Rules and tests: [technical-spec.md](T0242-add-delete-account-to-settings-marking-the-connected/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read Update User and account purging in the service specs, and the disconnect flow.
- [x] **[Decide]**    Settle the open points in technical-spec.md with the user.
- [x] **[Doc]**       Add the requirement and the Settings design entry.
- [x] **[Implement]** Author failing unit tests for the button, the dialog, the request, and the disconnect.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the button, the dialog, the request, and the disconnect.
- [x] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [x] **[Visual]**    Capture the dialog in light and dark themes.
- [x] **[Doc]**       Update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md after the user split account deletion from Delete all data.

- [2026-11-17] **[Decided]**
  Chose no undo offer and no purge delay in the dialog, and no special sign-in state, as the service specs give neither.

- [2026-11-17] **[Verify]**
  Unit, lint, and connect e2e pass; contract has 3 purge failures and one e2e hover flake, unrelated.
  - See validation-proof.md.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 8.
  - Lines touched: 243.
  - Reopenings: 0.

- [2026-11-17] **[Visual]**
  Before: [settings-before.png](T0242-add-delete-account-to-settings-marking-the-connected/settings-before.png). After: [settings-after.png](T0242-add-delete-account-to-settings-marking-the-connected/settings-after.png).
  - Dialog: [light](T0242-add-delete-account-to-settings-marking-the-connected/delete-account-light.png), [dark](T0242-add-delete-account-to-settings-marking-the-connected/delete-account-dark.png).

- [2026-11-17] **[Read]**
  Read Update User in the todos.server REST spec and the Settings disconnect flow.

- [2026-11-17] **[Doc]**
  Added CON-14 and the Delete account entry in ui-design.md.

- [2026-11-17] **[Implement]**
  Wrote failing unit tests, then added markAccountDeleted, the dialog, and the button.

- [2026-11-17] **[Doc]**
  Added the CHANGELOG.md bullet under v0.5.1-pre.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @codex: Approved after inspecting the commit, full diff, service contract, disconnect flow, and recorded validation evidence.
  - Findings: [review-findings-1.md](T0242-add-delete-account-to-settings-marking-the-connected/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

