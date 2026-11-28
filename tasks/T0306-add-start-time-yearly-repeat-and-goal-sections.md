---
id: T0306
owner: "@claude"
session: claude-20261128-15de92
needs: []
branch: task/T0306-add-start-time-yearly-repeat-and-goal-sections
worktree: .plan/work/T0306-add-start-time-yearly-repeat-and-goal-sections
status: active
started_at: "2026-11-28T03:37:30Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 2004.4, input: 46, output: 10398, cache_read: 6125076, cache_write: 27125}
  review: {turns: 2, duration_s: 94.3, input: 40340, output: 2325, cache_read: 475392, cache_write: 0}
work_duration: 2043.8
review_status: pending
review_round: 2
review_requested_at: "2026-11-28T04:13:53Z"
review_session: codex-20261128-13a485
---
# T0306: Rebuild the task editor as four tabs, with goals, recurrence, and start times on Configuration.

## Goals
Rebuild the task editor as the tabs Status, Notes, Configuration, and History, opening on Status.
Follow the Task Editor section of ui-design.md and `TSK-18`.
Move the notes to Notes, and put description, lists, goal, recurrence, time window, and Danger zone on Configuration.
Add the goal fields, the yearly unit, the start time, and the Fail overdue behavior, saved as lifecycle rule edits.
Keep today's status controls on the Status tab, without Cancel; T0307 replaces them.
Capture before and after screenshots of the task editor in light and dark themes.

## Task Execution Steps
- [x] **[Read]**      Read the Task Editor section of ui-design.md, its wireframes, task-editor.js, and its tests.
- [x] **[Implement]** Author failing unit and end-to-end tests for the tabs, goal, recurrence, time window, and Danger zone.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Add the tabs, the Configuration parts, validation, and rule edits.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots of the task editor in both themes.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Read]**
  Read ui-design.md, editor sources, tests, and store rules; the store lacks the year unit and decimal targets.

- [2026-11-28] **[Verify]**
  New tests fail: editor lacks tabs and goal fields; store lacks year and decimal targets.

- [2026-11-28] **[Implement]**
  Added four tabs, Goal, Recurrence with year, Time window with start and Fail, and Danger zone.
  - Size note: measured 9 files, 1473 lines; tab rebuild cannot merge apart.

- [2026-11-28] **[Implement]**
  Undeclared files touched: store tasks.js, store-tasks test, all-tasks, list, sharing e2e specs.
  - Store needed year unit and decimal targets.

- [2026-11-28] **[Verify]**
  Six e2e tests fail on base a8a3668 too; two stale task-editor e2e expectations were updated.

- [2026-11-28] **[Visual]**
  Captured before and after editor screenshots in light and dark themes, linked in validation-proof.md.

- [2026-11-28] **[Doc]**
  Added three CHANGELOG bullets under v0.6.1-pre; ui-design.md already specifies this editor.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: [Decided]** Reject pending correction of connected task start-time eligibility.
  - Findings: [review-findings-1.md](T0306-add-start-time-yearly-repeat-and-goal-sections/review-findings-1.md).

- [2026-11-28] **[Implement]**
  Review fix: connected Starts eligibility now reads server events, with local fallback and regression tests.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

