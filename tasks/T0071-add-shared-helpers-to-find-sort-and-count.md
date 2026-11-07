---
id: T0071
owner: "@claude"
session: claude-20261108-7fb151
needs: []
branch: task/T0071-add-shared-helpers-to-find-sort-and-count
worktree: .plan/work/T0071-add-shared-helpers-to-find-sort-and-count
status: completed
started_at: "2026-11-07T23:21:47Z"
ended_at: "2026-11-07T23:31:39Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 828.0, input: 216, output: 64356, cache_read: 9961778, cache_write: 226626}
  review: {turns: 4, duration_s: 271.6, input: 134326, output: 7082, cache_read: 1124096, cache_write: 0}
review_status: approved
review_round: 2
work_duration: 592.4
reviewed_by: "@codex"
completion-commit: 5ab34d22103f7972ccc54064ae50a94e1f2a3c54
---
# T0071: Add shared helpers to find, sort, and count lists, with unit tests

## Goals
Add pure helpers to find, sort, and count lists, shared by the sidebar and the Lists screen.
Follow ui-design.md, Lists Overview, Many Lists: matching, sort choices, and the one-pass counts (`LST-10`, `LST-12`).
Make layout.js and lists.js use the shared count helper, without a visible change.

## Task Execution Steps
- [x] **[Implement]** Author unit tests for finding, sorting, and counting lists, including 500 lists and 5000 tasks.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add list-find.js, list-sort.js, and list-counts.js, and let layout.js and lists.js call the counts.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Verify]**
  Tests failed first, then passed: 1163 tests, lint, and service worker check green.
  - Files touched: 14.
  - Lines touched: 84 tracked plus new files.
  - Reopenings: 0.

- [2026-11-08] **[Doc]**
  Undeclared files touched: app.js, index.html, service-worker.js, sw hash manifest, CHANGELOG.md, ui-design.md; precache tests required them.

- [2026-11-08] **[Implement]**
  Wrote find, sort, and count unit tests, then list-find.js, list-sort.js, and list-counts.js.
  - layout.js, lists.js, and app.js use countLists.

- [2026-11-08] **[Verify]**
  Red phase recorded: three new test files failed on missing modules before any code existed.

- [2026-11-08] **[Implement]**
  Added the new modules to preload, precache, and the hash manifest; bumped service worker VERSION to 2026-11-08.3.

- [2026-11-08] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-08] **[Review]**
  Round 1 rejected by @codex: [Decided]** Rejected pending unknown-sort handling and the specified count integration coverage.
  - Findings: [review-findings-1.md](T0071-add-shared-helpers-to-find-sort-and-count/review-findings-1.md).

- [2026-11-08] **[Implement]**
  Review round 1 rework: sortLists now looks up comparators by own key, so inherited keys like __proto__ keep manual order.

- [2026-11-08] **[Verify]**
  Added __proto__ regression test, red first, and a consumer test comparing sidebar and Lists counts.
  - 1170 tests, lint, and check:sw pass.
  - Proof now has verbatim output.

- [2026-11-08] **[Doc]**
  Size note: the task crossed the typical line because precache tests required 5 undeclared files and tests grew with review.

- [2026-11-08] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-08] **[Review]**
  Round 2 approved by @codex: [Decided]** Approved.
  - Findings: [review-findings-2.md](T0071-add-shared-helpers-to-find-sort-and-count/review-findings-2.md).

- [2026-11-08] **[Complete]**
  Task completed successfully.

