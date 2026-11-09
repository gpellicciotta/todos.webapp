---
id: T0216
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
# T0216: Add a Finished today only choice to the Status filter of the view options

## Goals
Add a "Finished today only" checkbox to the Status filter of the view options, in All tasks and every list view.
When checked, Completed and Cancelled tasks show only when they finished today; open tasks are unaffected.
A finished task counts as finished today when its `last-update-time` falls on the current local day.
Details, declared files, size, and tests live in [technical-spec.md](T0216-add-a-finished-today-only-choice-to-the/technical-spec.md).

## Task Execution Steps
- [ ] **[Implement]** Author unit tests for the query, view state, panel, and both screens' clock.
- [ ] **[Implement]** Author the e2e scenario in all-tasks.spec.js.
- [ ] **[Verify]**    Run the new tests and record their failure before the implementation.
- [ ] **[Implement]** Add the finishedToday test to filterTasks and clearFilters in query.js.
- [ ] **[Implement]** Add the checkbox, storage, and info line text in view-controls.js.
- [ ] **[Implement]** Re-render All tasks and list views on the clock while the choice is on.
- [ ] **[Verify]**    Run unit, e2e, lint, and service worker checks until green.
- [ ] **[Visual]**    Capture before and after screenshots of the Status filter row.
- [ ] **[Doc]**       Update requirements.md, ui-design.md, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-09] **[Doc]**
  Companion task file scaffolded at task creation.
