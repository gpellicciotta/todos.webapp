---
id: T0242
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
# T0242: Add Delete account to Settings, marking the connected account for deletion on the service

## Goals
Add Delete account to Settings, separate from Delete all data, which never touches the account.
- Shown only while connected; it marks the account for deletion through `PUT /api/users/{{user-id}}`.
- The service purges marked accounts later, with their lists and tasks.
- After marking, the app disconnects and keeps the local data, as a normal disconnect does.
- Rules and tests: [technical-spec.md](T0242-add-delete-account-to-settings-marking-the-connected/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read Update User and account purging in the service specs, and the disconnect flow.
- [ ] **[Decide]**    Settle the open points in technical-spec.md with the user.
- [ ] **[Doc]**       Add the requirement and the Settings design entry.
- [ ] **[Implement]** Author failing unit tests for the button, the dialog, the request, and the disconnect.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the button, the dialog, the request, and the disconnect.
- [ ] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [ ] **[Visual]**    Capture the dialog in light and dark themes.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md after the user split account deletion from Delete all data.
