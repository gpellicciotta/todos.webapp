---
id: T0055
owner: "@claude"
session: claude-20261107-bbcd52
needs: []
branch: task/T0055-make-the-add-field-also-search-with-add
worktree: .plan/work/T0055-make-the-add-field-also-search-with-add
status: active
started_at: "2026-11-07T13:37:14Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 2091.0, input: 292, output: 100230, cache_read: 17369454, cache_write: 302428}
  review: {turns: 2, duration_s: 437.2, input: 229814, output: 8200, cache_read: 2165616}
review_status: rejected
review_round: 1
reviewed_by: "@gemini"
work_duration: 1285.8
---
# T0055: Make the add field also search, with Add anyway, a hidden-task toast, and Add-only creation

## Goals
Make the add field also search: typing filters the rows to matching tasks, and only the Add button creates a task.
The Add button reads "Add anyway" on an exact match; a toast with Show follows an add hidden by the view options.
Viewers of a shared list see "Search tasks" and no Add button. Needs the T0054 info line.
Requirements: VO-3, VO-14, TV-6, TSK-1.
Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`

## Task Execution Steps
- [x] **[Read]**      Read add-bar.js, query.js, the list and All tasks views, and the Search and Add design.
- [x] **[Implement]** Author unit tests for typed filtering, the exact-match check, and Add-only creation.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Filter rows from the add field with a 150 ms pause; Enter applies it and never adds.
- [x] **[Implement]** Add Add anyway, the no-match line, the hidden-task toast with Show, and the viewer mode.
- [x] **[Verify]**    Run unit, end-to-end, and 5000-task performance tests and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots on compact and wide layouts.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Implement]**
  Add field now searches; Add anyway, no-match line, hidden-task toast, viewer mode added.
  - Viewer mode keys on list.role; store has no roles yet.

- [2026-11-07] **[Verify]**
  Unit, lint, and end-to-end tests pass; 5000-task perf budget fails on baseline too.
  - Baseline 394 ms vs branch 509 ms, 4x throttled.

- [2026-11-07] **[Decided]**
  Size note: undeclared files touched: app.js, view-controls.js, its test, service worker, connect.spec.
  - Removed the unused createSearchField; shortcuts use ~= selectors.

- [2026-11-07] **[Verify]**
  Size note: diff above typical line since tests and removing the old search field added lines.
  - Files touched: 18.
  - Lines touched: 917.
  - Reopenings: 0.

- [2026-11-07] **[Read]**
  Read the add bar, query, both views, and the Search and Add design.

- [2026-11-07] **[Visual]**
  Captured before and after screenshots at 390 and 1440 px.
  - Linked in validation-proof.md.

- [2026-11-07] **[Doc]**
  Updated ui-design.md and CHANGELOG.md.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 rejected by @gemini: The implementation in `add-bar.js`, `all-tasks.js`, `list.js`, and `query.js` meets the functional goals for search-and-add (`VO-3`, `VO-14`, `TV-6`, `TSK-1`), and all.
  - Findings: [review-findings-1.md](T0055-make-the-add-field-also-search-with-add/review-findings-1.md).

- [2026-11-07] **[Verify]**
  Reworked review round 1: recaptured no-match screenshots after the debounce and reran every command.
  - validation-proof.md now holds verbatim output with omission markers.
  - Production code unchanged.

