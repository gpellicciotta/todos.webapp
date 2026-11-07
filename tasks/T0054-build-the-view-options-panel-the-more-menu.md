---
id: T0054
owner: "@claude"
session: claude-20261107-9324dd
needs: []
branch: task/T0054-build-the-view-options-panel-the-more-menu
worktree: .plan/work/T0054-build-the-view-options-panel-the-more-menu
status: completed
started_at: "2026-11-07T13:08:27Z"
ended_at: "2026-11-07T13:36:54Z"
review: agent
preview: none
protocol: standard
size_status: approved
size_estimate: 21 files, 2227 lines
usage:
  worker: {turns: 6, duration_s: 5957.2, input: 132, output: 35800, cache_read: 18780928, cache_write: 82486}
  review: {turns: 4, duration_s: 931.4, input: 399680, output: 19204, cache_read: 3934030}
work_duration: 6163.5
size_approved: 21 files, 2227 lines
size_approved_by: "@gpellicciotta"
size_approved_at: "2026-11-07T13:08:03Z"
review_status: approved
review_round: 2
reviewed_by: "@gemini"
completion-commit: 25279d5cb1f6dfa3a3cc640a17ff15589886255e
---
# T0054: Build the View options panel, the More menu entries, and the info line for All tasks and list views

## Goals
Build the View options as the editor panel on wide layouts and a full screen on compact ones, per the View Options design.
Add Edit view options to the More menu of the list view and All tasks, plus the info line under the add bar.
Replace the filter chips, the Sort menu, the order buttons, and the status chip. T0048 adds the Group by control.
Requirements: VO-1, VO-2, VO-4 to VO-8, VO-13, LV-6 to LV-8, TV-12.
Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`

## Task Execution Steps
- [x] **[Read]**      Read view-controls.js, editor-panel.js, list.js, all-tasks.js, router.js, and the View Options design.
- [x] **[Implement]** Author unit tests for info line text, defaults, and Reset, and end-to-end tests for the panel.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Add the view-options routes and the panel with filters, sort, and Reset in the editor panel.
- [x] **[Implement]** Add Edit view options to the More menus and the info line; remove the old controls.
- [x] **[Verify]**    Run unit, end-to-end, and 5000-task performance tests and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots on compact and wide layouts.
- [x] **[Doc]**       Update the visual style gallery, documentation, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Size]**
  Size approval requested by the work loop: 21 files, 2227 lines exceeds 3x the approved 12 files, 700 lines.

- [2026-11-07] **[Size]**
  Size approved by @gpellicciotta for 21 files, 2227 lines.

- [2026-11-07] **[Implement]**
  Added view options routes, panel, info line, and More menu entries; removed chips, Sort menu, order buttons, and status chip.
  - Reset also clears search text.
  - Choosing a sort field sets its natural direction.

- [2026-11-07] **[Verify]**
  Lint, 780 unit tests, and 151 end-to-end tests pass; 5000-task budget passed early, then failed under machine load.
  - Main failed the same budget in that window.
  - Details in validation-proof.md.

- [2026-11-07] **[Doc]**
  Size note: 21 files, 2227 lines, approved by a human before completion; the panel, menus, and info line replace one control bar.

- [2026-11-07] **[Doc]**
  Updated gallery task list pattern, style guide, ui-design, CHANGELOG, and service worker VERSION; screenshots linked in validation-proof.md.
  - Files touched: 21.
  - Lines touched: 2227.
  - Reopenings: 0.

- [2026-11-07] **[Read]**
  Read the view controls, editor panel, list and All tasks screens, router, and the View Options design.

- [2026-11-07] **[Visual]**
  Captured before and after screenshots on compact and wide layouts; the compact Show button now sticks to the bottom.
  - Linked in validation-proof.md.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 rejected by @gemini: The View options panel, More menu entries, info line, and unit/E2E test coverage in commit `fb4f38d` are well-implemented and satisfy.
  - Findings: [review-findings-1.md](T0054-build-the-view-options-panel-the-more-menu/review-findings-1.md).

- [2026-11-07] **[Implement]**
  Review rework: resolved rebase conflicts, regenerated precache hashes, and moved the compact Show button below a scrolling options area.
  - Declared Files now list all 21 touched files.
  - Compact end-to-end test asserts no overlap.

- [2026-11-07] **[Verify]**
  Clean after rebase: lint, 804 unit, 153 end-to-end, check:sw, and the 5000-task budget at 171 and 166 ms.
  - Output and screenshots in validation-proof.md.

- [2026-11-07] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 2 approved by @gemini: All defects and process gaps from Round 1 have been resolved in commits `7a31572` and `ddd8fca`.
  - Findings: [review-findings-2.md](T0054-build-the-view-options-panel-the-more-menu/review-findings-2.md).

- [2026-11-07] **[Complete]**
  Task completed successfully.

