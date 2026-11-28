---
id: T0307
owner: "@claude"
session: claude-20261128-d09379
needs: []
branch: task/T0307-show-progress-and-over-limit-marks-a-log
worktree: .plan/work/T0307-show-progress-and-over-limit-marks-a-log
status: completed
started_at: "2026-11-28T04:57:02Z"
ended_at: "2026-11-28T05:38:42Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 2284.8, input: 40, output: 6074, cache_read: 5075461, cache_write: 24507}
  review: {turns: 2, duration_s: 130.9, input: 61506, output: 3513, cache_read: 636160, cache_write: 0}
work_duration: 2499.7
review_status: approved
review_round: 2
review_requested_at: "2026-11-28T05:37:57Z"
review_session: codex-20261128-5e4580
reviewed_by: "@codex"
completion-commit: 362373715c0ba9dde27e94b399e75d158017b152
---
# T0307: Show progress, check off, a log form, and undoable entries on the task editor Status tab.

## Goals
Build the editor's Status tab and History lines, per the Task Editor section of ui-design.md (`TSK-21`, `TSK-22`).
Show the status line, progress box, pace, check off, stepper, Mark started, Reopen, and the previous period button.
Replace the status buttons with these actions.
Add the Log form, with the 12-hour question, and the current period's entries with Undo.
Show progress, entries, and undos in History.
Put the progress, approaching, and on-track rules in one core module that task rows can reuse (T0312).
Capture before and after screenshots of the task editor in light and dark themes.

## Task Execution Steps
- [x] **[Read]**      Read the Task Editor and Key Flows sections of ui-design.md, the wireframes, and the views.
- [x] **[Implement]** Author failing unit and end-to-end tests for pace, the Status tab, the Log form, and history.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Add the progress module, the Status tab, the Log form, entries with undo, and history lines.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots of the task editor in both themes.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Read]**
  Read ui-design Task Editor, store log API, editor, history, and tests; progress module and unit tests written.

- [2026-11-28] **[Verify]**
  New unit and e2e tests fail for missing Status tab features: 28 unit, 2 e2e.

- [2026-11-28] **[Implement]**
  Added progress module, Status tab, Log form, entries with Undo, history lines, tokens, and icons.

- [2026-11-28] **[Verify]**
  Unit 2099 and e2e 300 pass; lint and SW check clean. See validation-proof.md.

- [2026-11-28] **[Visual]**
  Screenshots: [before light](T0307-show-progress-and-over-limit-marks-a-log/task-editor-status-before-light.png), [after light](T0307-show-progress-and-over-limit-marks-a-log/task-editor-status-after-light.png), dark pairs alongside.

- [2026-11-28] **[Doc]**
  Size note: 16 files, 1723 lines, past the estimate; status, log, entries, tokens, and tests form one flow.

- [2026-11-28] **[Doc]**
  Updated style guide and CHANGELOG; bumped service worker VERSION to 2026-11-28.11.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 17.
  - Lines touched: 1723.
  - Reopenings: 0.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: [Decided]** Reject: a cancelled task still offers a check action during the previous-period grace window.
  - Findings: [review-findings-1.md](T0307-show-progress-and-over-limit-marks-a-log/review-findings-1.md).

- [2026-11-28] **[Implement]**
  Disabled Check off previous period on cancelled tasks; added a grace-window test; bumped service worker VERSION to 2026-11-28.12.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 2 approved by @codex: [Decided]** Approve.
  - Findings: [review-findings-2.md](T0307-show-progress-and-over-limit-marks-a-log/review-findings-2.md).

- [2026-11-28] **[Complete]**
  Task completed successfully.

