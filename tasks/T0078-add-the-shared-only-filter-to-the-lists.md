---
id: T0078
owner: ~
needs: [T0074, T0028]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0078: Add the Shared only filter to the Lists screen sort menu while connected

## Goals
Add a Shared only checkbox to the Lists screen sort menu while connected and at least one list is shared.
Name it on the info line, persist it in `todos.view.lists`, and lock reordering while it is on (`LST-16`).
Follow ui-design.md, Many Lists: sort.

## Task Execution Steps
- [ ] **[Implement]** Author unit and e2e tests for the checkbox, the filter, the info line, and the reorder lock.
- [ ] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [ ] **[Implement]** Add the Shared only item to the sort menu and filter lists by sharing state with the SHR-3 data.
- [ ] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [ ] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.
