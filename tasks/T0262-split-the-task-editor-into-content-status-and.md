---
id: T0262
owner: "@claude"
session: claude-20261117-321641
needs: []
branch: task/T0262-split-the-task-editor-into-content-status-and
worktree: .plan/work/T0262-split-the-task-editor-into-content-status-and
status: active
started_at: "2026-11-17T15:28:27Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1835.9, input: 12, output: 2087, cache_read: 1068718, cache_write: 7450}
work_duration: 1875.0
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
- [x] **[Read]**      Read T0257's signed-off brief, task-editor.js, editor-panel.js, and the vendored tabs.js.
- [x] **[Implement]** Author failing unit and e2e tests for the tabs, their keys, the opening tab, and the Status layout.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the tabs with the vendored tabs.js, the Status rules, and Delete at the Status bottom.
- [x] **[Verify]**    Run the unit suite and the task editor e2e spec and confirm they pass.
- [x] **[Visual]**    Capture each tab at desktop panel and phone widths, in both themes.
- [x] **[Doc]**       Update the Task Editor section, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

- [2026-11-17] **[Doc]**
  Revised to the signed-off design: Lists and Delete move to Status; no header More menu.

- [2026-11-17] **[Verify]**
  New unit and e2e tab tests fail as expected: no tablist exists and the notes field lacks search.
  - Unit: 10 failed, 59 passed.
  - E2E: 2 failed, no tablist found.

- [2026-11-17] **[Implement]**
  Implemented the tabs, the Status rules, Delete at the Status bottom, the notes search, and tab-driven history loading; committed as ed86a6d.
  - tabs.js precached and preloaded; VERSION 2026-11-17.31.

- [2026-11-17] **[Verify]**
  Unit suite, lint, and SW check pass; affected e2e specs pass except a gallery toast test failing on main.
  - Unit: 1754 passed.
  - E2E: 139 passed, 1 failure from main.
  - Follow-up T0281 tracks it.

- [2026-11-17] **[Visual]**
  Captured before and after screenshots of each tab at 390 and 1440 px in both themes, with no console or network errors.
  - Links in validation-proof.md.

- [2026-11-17] **[Doc]**
  Updated the Task Editor section, the style guide, the gallery with working tabs, and CHANGELOG.md.

- [2026-11-17] **[Decided]**
  Kept Target count and Repeat field labels as group headings and added a Due heading; History sits in no fieldset, so viewers can refresh it.

- [2026-11-17] **[Implement]**
  Size note: 15 counted files and 748 lines cross the typical line; the tabs, notes search, and tests merge only together.
  - Undeclared files listed in technical-spec.md.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 15.
  - Lines touched: 748.
  - Reopenings: 0.

