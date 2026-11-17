---
id: T0240
owner: "@claude"
needs: []
branch: task/T0240-make-delete-all-data-also-erase-the-account
worktree: .plan/work/T0240-make-delete-all-data-also-erase-the-account
status: active
started_at: "2026-11-17T03:22:09Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0240: Make Delete all data also erase the account's lists and tasks while connected, queued while offline

## Goals
Make Delete all data erase the account's lists, tasks, and notes too, not only this device.
- Enable the button while connected; the dialog says what leaves the account and what collaborators lose.
- Queue the erase as one `erase` entry, so it waits out offline time and expired sessions.
- Never pull while an erase is queued, so erased data cannot come back first.
- Blocked until todos.server T0257 serves `DELETE /api/users/{{user-id}}/data` in production.
- Rules and tests: [technical-spec.md](T0240-make-delete-all-data-also-erase-the-account/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the T0257 route in the service REST API spec, push.js, engine.js, and the Settings dialog.
- [ ] **[Doc]**       Update BAK-15, the Settings design, and the local store and sync queue specs.
- [ ] **[Implement]** Author failing unit tests for the queued erase, its push, the pull block, and the dialog.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the erase entry, its push, the pull block, and the connected dialog.
- [ ] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [ ] **[Visual]**    Capture the connected dialog and the enabled button in light and dark themes.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's Delete all data decisions.
