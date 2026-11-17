---
id: T0262
owner: "@claude"
needs: []
branch: task/T0262-split-the-task-editor-into-content-status-and
worktree: .plan/work/T0262-split-the-task-editor-into-content-status-and
status: active
started_at: "2026-11-17T15:28:27Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0262: Split the task editor into Content, Status, and History tabs, with Lists and Delete on Status

## Goals
Split the long task editor into three tabs, by the Tabs rules in T0257's signed-off brief.
- Content holds Description and Notes only; the Add a note field also searches the notes.
- History holds History, then Details.
- The editor always opens on Content and keeps the description focus rule (`TSK-13`).
- Status holds, split by horizontal rules: Status, Lists, then Target count, Due, Overdue behavior, and Repeat.
- Delete task sits at the bottom of Status, after a last rule.
- Escape still closes the editor, and the phone sheet keeps working.
- Rules and tests: [technical-spec.md](T0262-split-the-task-editor-into-content-status-and/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read T0257's signed-off brief, task-editor.js, editor-panel.js, and the vendored tabs.js.
- [ ] **[Implement]** Author failing unit and e2e tests for the tabs, their keys, the opening tab, and the Status layout.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the tabs with the vendored tabs.js, the Status rules, and Delete at the Status bottom.
- [ ] **[Verify]**    Run the unit suite and the task editor e2e spec and confirm they pass.
- [ ] **[Visual]**    Capture each tab at desktop panel and phone widths, in both themes.
- [ ] **[Doc]**       Update the Task Editor section, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

- [2026-11-17] **[Doc]**
  Revised to the signed-off design: Lists and Delete move to Status; no header More menu.
