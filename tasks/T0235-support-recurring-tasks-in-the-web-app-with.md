---
id: T0235
owner: "@claude"
session: claude-20261115-2d98ad
needs: []
branch: task/T0235-support-recurring-tasks-in-the-web-app-with
worktree: .plan/work/T0235-support-recurring-tasks-in-the-web-app-with
status: active
started_at: "2026-11-15T10:42:24Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 4806.8, input: 728, output: 305832, cache_read: 95442830, cache_write: 772940}
  review: {turns: 2, duration_s: 1632.2, input: 988364, output: 73376, cache_read: 10907824}
review_status: pending
review_round: 2
review_requested_at: "2026-11-15T11:36:43Z"
review_session: antigravity-20261115-b303ad
work_duration: 2594.4
size_status: approved
size_approved: 25 files, 1433 lines
size_approved_by: "@giova"
size_approved_at: "2026-11-15T11:32:10Z"
---
# T0235: Support recurring tasks in the web app, with local period math, a rule editor, grace completion, and history

## Goals
Add JS period math for day, week, and month units with intervals and IANA timezones, passing the shared vectors.
Roll recurring tasks over locally in local mode; while connected, apply the display rule until the server rolls over.
Edit unit, interval, end date, end count, and timezone, and offer grace completion for the previous period.
Add a history view of events and occurrences, online from the server and local in local mode.
Start after T0224, todos.server T0221, and todos.server T0219, which authors `docs/specs/recurrence-test-vectors.json`.
Follow the [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the T0215 spec, the shared recurrence vectors, the T0224 occurrence fold, and the editor code.
- [x] **[Decided]**   Local mode keeps recurring tasks with local period math and roll-over, decided on 2026-11-13.
- [x] **[Implement]** Author periods tests over the shared vectors and roll-over, display rule, and grace unit tests.
- [x] **[Implement]** Author e2e tests that set a weekly recurrence locally, tick it, and roll it over.
- [x] **[Verify]**    Run the unit and e2e suites and capture the expected red-phase failures.
- [x] **[Implement]** Add periods.js and local roll-over with missed periods and recurrence ends.
- [x] **[Implement]** Add the recurrence editor, the display rule, and the grace completion menu item.
- [x] **[Implement]** Add the history view over the events and occurrences routes and local stores.
- [x] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [x] **[Visual]**    Capture before and after screenshots of the editor, a recurring row, and the history view.
- [x] **[Doc]**       Update requirements, local-store.md, ui-design.md, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Wrote the recurrence part of the approved T0224 split, with local period math for local mode.

- [2026-11-15] **[Verify]**
  Ran unit, lint, service worker, e2e, and contract suites green; output is in validation-proof.md.
  - Unit: 1388 passed.
  - E2E: 209 passed.
  - Contract: 10 passed against todos.server 9564bec.

- [2026-11-15] **[Visual]**
  Captured screenshots of the editor, a recurring row, and the history view.
  - [before-editor.png](T0235-support-recurring-tasks-in-the-web-app-with/before-editor.png), [after-editor.png](T0235-support-recurring-tasks-in-the-web-app-with/after-editor.png).
  - [before-recurring-row.png](T0235-support-recurring-tasks-in-the-web-app-with/before-recurring-row.png), [after-recurring-row.png](T0235-support-recurring-tasks-in-the-web-app-with/after-recurring-row.png).
  - [after-history.png](T0235-support-recurring-tasks-in-the-web-app-with/after-history.png).

- [2026-11-15] **[Implement]**
  Size note: counted 21 files and 1250 lines, above the large line; undeclared files are listed in technical-spec.md.
  - Files touched: 21.
  - Lines touched: 1250.
  - Reopenings: 0.

- [2026-11-15] **[Read]**
  Read the server business logic and REST specs, the Java roll-over and placement code, the shared vectors, and the web app fold and editor.

- [2026-11-15] **[Implement]**
  Wrote failing unit tests over the 31 shared vectors, roll-over, end rules, display rule, grace, rule editor, and history.

- [2026-11-15] **[Implement]**
  Wrote a failing e2e test that sets a weekly recurrence locally, ticks it, fast-forwards the clock, and reads the history.

- [2026-11-15] **[Verify]**
  Captured the red phase: 33 unit failures in 5 files and the e2e test failing on the missing Repeat field.

- [2026-11-15] **[Implement]**
  Added periods.js, store roll-over with missed periods and end rules, fresh-period reopen, and the local roll-over timer.

- [2026-11-15] **[Implement]**
  Added the recurrence editor fields, the display rule in rows and the editor, the repeat chip, and grace completion.

- [2026-11-15] **[Implement]**
  Added task-history.js, reading the server routes while connected and the local stores otherwise, inside the task editor.

- [2026-11-15] **[Doc]**
  Updated requirements with TSK-16 and TSK-17, local-store.md Recurrence, ui-design.md rows and editor, and CHANGELOG.md.

- [2026-11-15] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-15] **[Review]**
  Round 1 rejected by @gemini: Period math, local roll-over, the recurrence editor, history, unit tests, e2e tests, and contract tests pass.
  - Findings: [review-findings-1.md](T0235-support-recurring-tasks-in-the-web-app-with/review-findings-1.md).

- [2026-11-15] **[Size]**
  Size approved by @giova for 25 files, 1433 lines.

- [2026-11-15] **[Implement]**
  Reworked review round 1: display rule before filters and counts, ended-series reopen only, period-end fold order, and queue undo modes.

- [2026-11-15] **[Verify]**
  Regression tests fail 10 of 10 on the reviewed source; unit, lint, SW, Markdown, e2e, and contract suites pass after the rework.
  - Unit: 1398 passed.
  - E2E: 209 passed.
  - Contract: 10 passed.

- [2026-11-15] **[Implement]**
  Size note: now 24 counted files and 1409 lines, above the large line; human size approval is still pending.
  - Files touched: 24.
  - Lines touched: 1409.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 2 requested (mode: agent).

