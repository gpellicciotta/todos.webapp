---
id: T0237
owner: "@claude"
needs: []
branch: task/T0237-show-task-notes-on-their-occurrence-and-let
worktree: .plan/work/T0237-show-task-notes-on-their-occurrence-and-let
status: active
started_at: "2026-11-14T23:29:46Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0237: Show task notes on their occurrence, and let users keep a note global or tie it to an occurrence

## Goals
Show each note of a recurring task on its occurrence in the task history, and global notes on the task.
Let the note editor keep a note global or tie it to an occurrence, for one-off and recurring tasks.
Send and merge the note `occurrence` field, following [Notes and Occurrences](../../../todos.server/docs/specs/business-logic-spec.md#notes-and-occurrences) and [Task Notes](../../../todos.server/docs/specs/rest-api-spec.md#task-notes).
Start after todos.server T0249 adds the link to the REST note routes.

## Task Execution Steps
- [ ] **[Read]**      Read the server specs on note links and the web app's note and history views.
- [ ] **[Implement]** Author tests for showing linked notes and changing a note's link.
- [ ] **[Verify]**    Run the tests and capture the expected failures.
- [ ] **[Implement]** Show notes on their occurrence and add the global-or-occurrence choice to the note editor.
- [ ] **[Verify]**    Run the tests and check the views in the browser.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-14] **[Doc]**
  Companion task file scaffolded at task creation.
