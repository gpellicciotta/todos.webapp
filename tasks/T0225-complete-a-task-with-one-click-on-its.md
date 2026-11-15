---
id: T0225
owner: "@claude"
needs: []
branch: task/T0225-complete-a-task-with-one-click-on-its
worktree: .plan/work/T0225-complete-a-task-with-one-click-on-its
status: active
started_at: "2026-11-15T00:47:40Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0225: Complete a task with one click on its status button, keeping the full status menu one step away

## Goals
Make completing a task, the most frequent action, take one click instead of two.
- A click on the status button of `todo` or `in-progress` sets `completed`; on `completed` or `cancelled` it sets `todo`.
- The full status menu stays one step away, and the task editor keeps its status control.
- The `x` key toggles completion of the focused row.
- A completion that hides the row shows a toast with Undo.
- Motivation: [comparing-with-google-products.md](https://github.com/gpellicciotta/todos.server/blob/main/docs/comparing-with-google-products.md), section Completing Work.

Completion check: `npm run test:unit` and the list and all-tasks e2e specs pass.
Size estimate: 8 files, 300 lines.

## Task Execution Steps
- [ ] **[Read]**      Read the task row, status menu, toast, and shortcut code, and requirements TSK-4 and SHR-4.
- [ ] **[Decide]**    Decide how the full status menu opens: context menu and long press, or a small chevron button.
- [ ] **[Implement]** Author failing unit and e2e tests for click toggling, the menu path, the shortcut, and Undo.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement click toggling, the menu path, the `x` shortcut, and the Undo toast.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Inspect rows at 390 px and 1440 px, in both themes, by mouse, touch, and keyboard.
- [ ] **[Doc]**       Update TSK-4, the Task Row design, the shortcut list, the wireframes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.
