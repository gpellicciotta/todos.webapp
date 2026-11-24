---
id: T0289
owner: "@claude"
session: claude-20261124-aba724
needs: []
branch: task/T0289-let-the-editor-panel-width-limits-use-the
worktree: .plan/work/T0289-let-the-editor-panel-width-limits-use-the
status: active
started_at: "2026-11-24T12:06:49Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 674.9, input: 84, output: 23908, cache_read: 3604448, cache_write: 100884}
review_status: pending
review_round: 1
review_requested_at: "2026-11-24T12:18:13Z"
---
# T0289: Let the editor panel width limits use the rail or hidden sidebar width instead of the open sidebar width

## Goals
The task editor's maximum width subtracts the stored open sidebar width, even while the sidebar is a rail or hidden.
At 1100 px with a 16rem sidebar in the rail, the editor stops at 28.75rem instead of 40rem.
Make [panel-resize.js](../../src/js/ui/panel-resize.js) use the sidebar's shown width: the rail track, or 0 when hidden.
Recompute the limits and the applied widths whenever the nav toggle changes the sidebar state.
Keep the stored open width, so reopening the sidebar restores it.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [x] **[Read]**      Read panel-resize.js, the attachAppNav wiring in layout.js, and the rail track in the vendored shell.css.
- [x] **[Implement]** Write the unit and e2e tests of the technical spec.
- [x] **[Verify]**    Run them and confirm they fail on main.
- [x] **[Implement]** Measure the shown sidebar width for the editor limits and refresh them on nav state changes.
- [x] **[Verify]**    Run the completion check.
- [x] **[Doc]**       Update the UI design spec and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Specified and moved to Next Milestone after T0254, which changes the nav toggle; T0286 waits on it.

- [2026-11-24] **[Decided]**
  Observed the sidebar hidden attribute and toggle aria-expanded instead of wiring refresh into layout.js; media changes skip onChange.

- [2026-11-24] **[Decided]**
  Kept the sidebar-yields-first rule on reopening; at 1100 px the sidebar shows 12rem, and 1440 px restores both stored widths.

- [2026-11-24] **[Verify]**
  Ran python scripts/devops.py check with exit code 0; new tests failed on main first.
  - Vitest: 1789 passed; Playwright: 276 passed.
  - pytest: 190 passed; ESLint and Ruff clean.

- [2026-11-24] **[Verify]**
  Recorded task outcomes.
  - Files touched: 5.
  - Lines touched: 150.
  - Reopenings: 0.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

