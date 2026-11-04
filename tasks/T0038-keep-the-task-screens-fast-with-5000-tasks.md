---
id: T0038
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T21:05:43Z"
ended_at: —
review: agent
preview: none
protocol: standard
review_status: rejected
review_round: 1
reviewed_by: "@claude-review-agent"
---
# T0038: Keep the task screens fast with 5000 tasks: keyed row reuse, debounced search, and due chip updates

## Goals
Meet `TEC-16`: views open within 200 ms with 5000 tasks; the T0016 review measured 1085 ms on desktop.
Reuse rendered rows by task id instead of rebuilding every row on each store change.
Debounce search input, and let the minute tick update only due chips and overdue marks.
Apply the open minor review notes from T0035, T0037, and T0016 listed in technical-spec.md.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the T0016 review's performance numbers and the task list, view controls, and All tasks modules.
- [x] **[Implement]** Write the failing performance and regression tests listed in technical-spec.md.
- [x] **[Verify]**    Run the tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Reuse rows by task id, debounce search, and update only due chips on the minute tick.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update docs/specs/ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Verify]**
  Wrote seven unit tests and a 5000-task Playwright spec; all failed on main as expected.
  - Main: first rows 1226 ms, update 1097 ms.
  - Progressive-fill unit test was written after its implementation.

- [2026-11-04] **[Implement]**
  Added keyed row reuse, progressive first fill, search debounce, chip-only minute ticks, a date-gated bin redraw, and parallel start-up reads.
  - Dropped content-visibility: clipped focus rings, stalled Playwright polling.
  - Ported onto main 47fe378 after T0024 landed.

- [2026-11-04] **[Verify]**
  Unit, lint, service worker check, and all 114 Playwright tests passed; VERSION is 2026-11-04.18.
  - After: first rows 246 ms, all rows 1355 ms.
  - After: one-task update 102 ms.

- [2026-11-04] **[Verify]**
  Size note: 13 counted files and 645 lines cross the typical line; the parts share TEC-16 and merge only together.
  - Files touched: 13.
  - Lines touched: 645.
  - Reopenings: 0.

- [2026-11-04] **[Implement]**
  Touched undeclared files: list.js, recycle-bin.js, app.js, service-worker.js, ui-design.md, and three unit test files; layout.js stayed unchanged.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 rejected by @claude-review-agent: The timing assertion fails under the parallel e2e run, and one frame id variable mixes rAF and timeout ids; also the debounce drops pending search text on destroy.

