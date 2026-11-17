---
id: T0241
owner: "@claude"
needs: []
branch: task/T0241-erase-the-last-account-s-lists-and-tasks
worktree: .plan/work/T0241-erase-the-last-account-s-lists-and-tasks
status: active
started_at: "2026-11-17T11:02:32Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0241: Erase the last account's lists and tasks on the next connect after Delete all data in local mode

## Goals
Make a Delete all data done in local mode reach the account on the next connect.
- Record a pending erase with its time and the account this device was last connected to.
- On connect to that same account, erase its data created before that time, then adopt the local data.
- On connect to another account, or from a device never connected, ask before erasing anything.
- Rules and tests: [technical-spec.md](T0241-erase-the-last-account-s-lists-and-tasks/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the T0240 erase entry, adopt.js, the disconnect in pull.js, and the connect flow in Settings.
- [ ] **[Doc]**       Update BAK-15, CON-4, the local store spec, and the Settings design.
- [ ] **[Implement]** Author failing unit tests for the pending erase, the account match, the question, and the order.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the pending erase, the last account, the connect question, and the erase before adoption.
- [ ] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [ ] **[Visual]**    Capture the connect question in light and dark themes.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's Delete all data decisions.
