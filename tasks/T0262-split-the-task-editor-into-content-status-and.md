---
id: T0262
owner: ~
needs: [T0258]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0262: Split the task editor into Content, Status, and History tabs, with Delete in a header More menu

## Goals
Split the long task editor into three tabs, by the Tabs rules in T0257's signed-off brief.
- Content holds Description, Lists, and Notes; Status holds Status, Target count, Due, Overdue behavior, and Repeat.
- History holds History, then Details.
- The editor always opens on Content and keeps the description focus rule (`TSK-13`).
- Delete task moves to a More menu in the editor header.
- Escape still closes the editor, and the phone sheet keeps working.
- Rules and tests: [technical-spec.md](T0262-split-the-task-editor-into-content-status-and/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read T0257's signed-off brief, task-editor.js, editor-panel.js, and the vendored tabs.js and menu.js.
- [ ] **[Implement]** Author failing unit and e2e tests for the tabs, their keys, the opening tab, and the More menu.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the tabs with the vendored tabs.js, and the header More menu with menu.js.
- [ ] **[Verify]**    Run the unit suite and the task editor e2e spec and confirm they pass.
- [ ] **[Visual]**    Capture each tab at desktop panel and phone widths, and the More menu, in both themes.
- [ ] **[Doc]**       Update the Task Editor section, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

