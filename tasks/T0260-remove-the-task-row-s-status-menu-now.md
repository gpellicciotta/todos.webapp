---
id: T0260
owner: "@claude"
session: claude-20261117-04bb44
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
- [x] **[Read]**      Read the status menu code in task-list.js, its styles, gallery specimen, and tests.
- [x] **[Implement]** Change the unit and e2e tests to expect no status menu, and drop the menu's own tests.
- [x] **[Verify]**    Run the changed tests and confirm they fail while the menu still exists.
- [x] **[Implement]** Remove the status menu, its keys, long press, styles, and gallery specimen.
- [x] **[Verify]**    Run the unit suite and the list and gallery e2e specs and confirm they pass.
- [x] **[Visual]**    Capture a row's status button before and after, with its tooltip, in both themes.
- [x] **[Doc]**       Update the Task Row section, the style guide, the requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

- [2026-11-17] **[Verify]**
  Red phase: changed unit and e2e tests fail while the status menu exists.
  - Unit: 8 failed, 104 passed.
  - E2E list, gallery, all-tasks: 5 failed, 63 passed.

- [2026-11-17] **[Implement]**
  Removed the status menu, its keys, context menu handler, long press, styles, and gallery specimen; tooltip names only status and counts.
  - Undeclared: tests/e2e/all-tasks.spec.js, tests/unit/recurrence-review.test.js.
  - Undeclared: docs/specs/local-store.md.

- [2026-11-17] **[Implement]**
  Size note: 13 files and 580 lines exceed the typical line; removing one component crosses JS, CSS, gallery, docs, and tests.

- [2026-11-17] **[Decided]**
  Kept the row's filter-hide toast logic in post; only ticks call it now, so its always flag is constant. Follow-up task filed.

- [2026-11-17] **[Verify]**
  Green: unit suite 1727 passed; list, gallery, all-tasks, task-editor e2e 80 passed; eslint clean.
  - Evidence in validation-proof.md.

- [2026-11-17] **[Visual]**
  Captured row status button with tooltip caption and gallery section, before and after, both themes; links in validation-proof.md.
  - Before: [light](T0260-remove-the-task-row-s-status-menu-now/row-status-before-light.png), [dark](T0260-remove-the-task-row-s-status-menu-now/row-status-before-dark.png).
  - After: [light](T0260-remove-the-task-row-s-status-menu-now/row-status-after-light.png), [dark](T0260-remove-the-task-row-s-status-menu-now/row-status-after-dark.png).
  - Gallery before: [light](T0260-remove-the-task-row-s-status-menu-now/gallery-status-button-before-light.png), [dark](T0260-remove-the-task-row-s-status-menu-now/gallery-status-button-before-dark.png).
  - Gallery after: [light](T0260-remove-the-task-row-s-status-menu-now/gallery-status-button-after-light.png), [dark](T0260-remove-the-task-row-s-status-menu-now/gallery-status-button-after-dark.png).

- [2026-11-17] **[Doc]**
  Updated the Task Row section, style guide, requirements TSK-4, local store display rule, and CHANGELOG.md.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 13.
  - Lines touched: 580.
  - Reopenings: 0.

