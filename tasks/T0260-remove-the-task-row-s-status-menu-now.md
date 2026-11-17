---
id: T0260
owner: "@claude"
needs: []
branch: task/T0260-remove-the-task-row-s-status-menu-now
worktree: .plan/work/T0260-remove-the-task-row-s-status-menu-now
status: active
started_at: "2026-11-17T13:26:57Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0260: Remove the task row's status menu, now that the task editor holds every status action

## Goals
Remove the row status menu, since the task editor of T0258 now offers every status action.
- Right-click, long press, Down, Up, Shift+F10, and the Menu key no longer open a menu on the status button.
- Complete for previous period lives only in the task editor.
- Remove the menu's code, styles, gallery specimen, style guide entry, and tests.
- Size note: removing one component crosses JS, CSS, gallery, docs, and tests; no split piece merges alone.
- Rules and tests: [technical-spec.md](T0260-remove-the-task-row-s-status-menu-now/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the status menu code in task-list.js, its styles, gallery specimen, and tests.
- [ ] **[Implement]** Change the unit and e2e tests to expect no status menu, and drop the menu's own tests.
- [ ] **[Verify]**    Run the changed tests and confirm they fail while the menu still exists.
- [ ] **[Implement]** Remove the status menu, its keys, long press, styles, and gallery specimen.
- [ ] **[Verify]**    Run the unit suite and the list and gallery e2e specs and confirm they pass.
- [ ] **[Visual]**    Capture a row's status button before and after, with its tooltip, in both themes.
- [ ] **[Doc]**       Update the Task Row section, the style guide, the requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

