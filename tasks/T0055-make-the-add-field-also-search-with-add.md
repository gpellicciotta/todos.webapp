---
id: T0055
owner: ~
needs: ['T0054']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0055: Make the add field also search, with Add anyway, a hidden-task toast, and Add-only creation

## Goals
Make the add field also search: typing filters the rows to matching tasks, and only the Add button creates a task.
The Add button reads "Add anyway" on an exact match; a toast with Show follows an add hidden by the view options.
Viewers of a shared list see "Search tasks" and no Add button. Needs the T0054 info line.
Requirements: VO-3, VO-14, TV-6, TSK-1.
Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`

## Task Execution Steps
- [ ] **[Read]**      Read add-bar.js, query.js, the list and All tasks views, and the Search and Add design.
- [ ] **[Implement]** Author unit tests for typed filtering, the exact-match check, and Add-only creation.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Filter rows from the add field with a 150 ms pause; Enter applies it and never adds.
- [ ] **[Implement]** Add Add anyway, the no-match line, the hidden-task toast with Show, and the viewer mode.
- [ ] **[Verify]**    Run unit, end-to-end, and 5000-task performance tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots on compact and wide layouts.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
