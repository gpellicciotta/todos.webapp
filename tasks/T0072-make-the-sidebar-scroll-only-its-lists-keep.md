---
id: T0072
owner: "@claude"
session: claude-20261117-39ee2e
needs: []
branch: task/T0072-make-the-sidebar-scroll-only-its-lists-keep
worktree: .plan/work/T0072-make-the-sidebar-scroll-only-its-lists-keep
status: active
started_at: "2026-11-17T04:19:10Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 286.2, input: 68, output: 19734, cache_read: 3155188, cache_write: 87544}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T04:24:04Z"
---
# T0072: Make the sidebar scroll only its lists, keep the current list in view, and patch rows in place

## Goals
Make the wide sidebar scroll only its list rows, below fixed brand, All tasks, and Lists items.
Keep the current list in view, keep the scroll across routes, and patch rows by list identifier.
Hide a zero count and cap counts at "999+"; see ui-design.md, Sidebar With Many Lists (`LST-14`).

## Task Execution Steps
- [x] **[Implement]** Author unit and e2e tests for the scroll region, the in-view rule, and in-place patching.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add a fixed header and scroll region, patch rows by id, and scroll the current row into view.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Implement]**
  Declared CSS files do not exist; styles went into app-chrome.css. Count markup now has aria-hidden visible text.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 6.
  - Lines touched: 269.
  - Reopenings: 0.

- [2026-11-17] **[Implement]**
  Authored unit and e2e tests for scroll region, in-place patching, counts, and reveal.

- [2026-11-17] **[Verify]**
  New tests failed before the code: 9 unit failures recorded in validation-proof.md.

- [2026-11-17] **[Doc]**
  Updated ui-design.md, changelog, and layout.js module comments.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

