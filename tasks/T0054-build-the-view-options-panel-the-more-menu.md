---
id: T0054
owner: "@claude"
session: claude-20261107-9324dd
needs: []
branch: task/T0054-build-the-view-options-panel-the-more-menu
worktree: .plan/work/T0054-build-the-view-options-panel-the-more-menu
status: active
started_at: "2026-11-07T11:54:10Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0054: Build the View options panel, the More menu entries, and the info line for All tasks and list views

## Goals
Build the View options as the editor panel on wide layouts and a full screen on compact ones, per the View Options design.
Add Edit view options to the More menu of the list view and All tasks, plus the info line under the add bar.
Replace the filter chips, the Sort menu, the order buttons, and the status chip. T0048 adds the Group by control.
Requirements: VO-1, VO-2, VO-4 to VO-8, VO-13, LV-6 to LV-8, TV-12.
Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`

## Task Execution Steps
- [x] **[Read]**      Read view-controls.js, editor-panel.js, list.js, all-tasks.js, router.js, and the View Options design.
- [x] **[Implement]** Author unit tests for info line text, defaults, and Reset, and end-to-end tests for the panel.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Add the view-options routes and the panel with filters, sort, and Reset in the editor panel.
- [x] **[Implement]** Add Edit view options to the More menus and the info line; remove the old controls.
- [ ] **[Verify]**    Run unit, end-to-end, and 5000-task performance tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots on compact and wide layouts.
- [ ] **[Doc]**       Update the visual style gallery, documentation, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
