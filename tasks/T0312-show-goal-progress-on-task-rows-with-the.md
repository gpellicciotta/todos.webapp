---
id: T0312
owner: "@claude"
session: claude-20261128-75bfc6
needs: []
branch: task/T0312-show-goal-progress-on-task-rows-with-the
worktree: .plan/work/T0312-show-goal-progress-on-task-rows-with-the
status: active
started_at: "2026-11-28T06:04:37Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1663.1, input: 202, output: 94343, cache_read: 18324577, cache_write: 248503}
  review: {turns: 1, duration_s: 101.8, input: 30234, output: 2468, cache_read: 384000, cache_write: 0}
review_status: pending
review_round: 2
review_requested_at: "2026-11-28T06:40:31Z"
review_session: codex-20261128-54d021
work_duration: 1669.8
---
# T0312: Show goal progress on task rows, with the quick log, Failed status, and upcoming tasks

## Goals
Show ADR-0006 goals on task rows and in views, per the Task Row, Quick Log, and View Options parts of ui-design.md.
Rows show the meter, progress, logged time, the new status icons, Failed, over-limit and behind-pace marks, and upcoming starts.
The status button logs a check or opens the quick log by goal, and its Undo toast posts `undo-log` (`TSK-4`, `TSK-21`).
View options add the Failed status, the finished-today brace, Show upcoming, the Upcoming group, and group by status.
Reuse the progress module and the log fields of T0307.
Capture before and after screenshots of the lists and view options in light and dark themes.

## Task Execution Steps
- [x] **[Read]**      Read the Task Row, Quick Log, View Options, and Key Flows sections, the wireframes, and the views.
- [x] **[Implement]** Author failing unit and end-to-end tests for row marks, clicks per goal, the quick log, and views.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Add the row marks, the quick log, the undo toast, and the view options.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots of the lists and view options in both themes.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Verify]**
  New tests fail: quick-log module and clickOf missing, row marks absent.
  - 33 task-list failures, 1 failed suite.

- [2026-11-28] **[Implement]**
  Added row marks, quick log, undo toast, Show upcoming and Upcoming group.
  - Unit suite: 2137 pass, eslint clean.

- [2026-11-28] **[Verify]**
  Unit, lint, and end-to-end suites pass with the new tests.
  - 2137 unit tests, 301 e2e tests passed.

- [2026-11-28] **[Visual]**
  Captured before and after screenshots in both themes.
  - See validation-proof.md for the links.

- [2026-11-28] **[Doc]**
  Updated style guide, FAQ, and CHANGELOG.
  - Size note: 550-line estimate, 7 files; undeclared: query.js tests, index.html, service-worker.js.

- [2026-11-28] **[Read]**
  Read Task Row, Quick Log, View Options, and Key Flows sections plus code.

- [2026-11-28] **[Verify]**
  Recorded task outcomes. Size note: estimate of 7 files and 550 lines exceeded; marks and quick log cannot merge apart.
  - Files touched: 20.
  - Lines touched: 1000.
  - Reopenings: 0.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: [Decided]** Reject: the quick log can submit duplicate entries while a request is pending.
  - Findings: [review-findings-1.md](T0312-show-goal-progress-on-task-rows-with-the/review-findings-1.md).

- [2026-11-28] **[Implement]**
  Guarded every quick-log submission path while a request is pending.
  - Regression tests added; 2139 unit tests pass.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

