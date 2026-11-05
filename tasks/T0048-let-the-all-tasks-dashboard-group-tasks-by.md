---
id: T0048
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
# T0048: Let the All tasks dashboard group tasks by List, Due Date, or Status

## Goals
Let the All tasks dashboard group tasks by List, Due Date, or Status, or not at all.
Groups show a header with a count; search, filters, and sort apply inside each group.
The choice persists per device. Long lists stay virtualized.
Adds the Group by control to the View options panel that T0054 builds; see VO-9 to VO-12.
Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js`

## Task Execution Steps
- [ ] **[Read]**      Read query.js, all-tasks.js, and the virtualization in task-list.js.
- [ ] **[Implement]** Author tests for the grouping function and for group headers on All tasks.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Add groupTasks to query.js with List, Due Date, and Status groupings and ordered buckets.
- [ ] **[Implement]** Render group headers in the virtualized task list and add the Group by control to the View options panel.
- [ ] **[Implement]** Persist the grouping choice in preferences.
- [ ] **[Verify]**    Run unit, end-to-end, and 5000-task performance tests and confirm they pass.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
