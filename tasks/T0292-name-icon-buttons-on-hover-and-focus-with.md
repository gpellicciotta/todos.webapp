---
id: T0292
owner: "@claude"
session: claude-20261124-e05175
needs: []
branch: task/T0292-name-icon-buttons-on-hover-and-focus-with
worktree: .plan/work/T0292-name-icon-buttons-on-hover-and-focus-with
status: active
started_at: "2026-11-24T13:58:20Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 725.5, input: 98, output: 20984, cache_read: 4169108, cache_write: 97771}
review_status: pending
review_round: 1
review_requested_at: "2026-11-24T14:10:36Z"
---
# T0292: Name icon buttons on hover and focus with the vendored label tooltips instead of native titles

## Goals
Attach the vendored `attachLabelTooltips` once to the app shell, so every `.icon-button` shows its name on hover and focus.
Today most icon buttons show nothing on hover, and a few repeat their name in a native `title`.
Drop `title` where it only repeats the accessible name: the inbox button and the Lists add button.
Keep `title` hints that say more than the name, such as task status buttons; those controls skip the tooltip.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [x] **[Read]**      Read attachLabelTooltips in the vendored tooltip.js and every icon button with a title.
- [x] **[Implement]** Write the unit and e2e tests of the technical spec.
- [x] **[Verify]**    Run them and confirm they fail on main.
- [x] **[Implement]** Attach the label tooltips in the shell and drop the titles that repeat names.
- [x] **[Verify]**    Run the completion check and capture before and after screenshots of a hovered button.
- [x] **[Doc]**       Update the UI design spec, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.

- [2026-11-24] **[Decided]**
  Selector covers .icon-button and .fab, so the New list button keeps a hover name after losing its title; the shell gained destroy().

- [2026-11-24] **[Implement]**
  Touched undeclared tests/unit/inbox-ui.test.js and tests/unit/lists.test.js for the dropped titles.
  - Size note: 10 counted files, 147 lines; the two tests guard the dropped titles.

- [2026-11-24] **[Verify]**
  Completion check passed; screenshots linked in validation-proof.md: before-hover.png and after-hover.png.
  - Files touched: 10.
  - Lines touched: 147.
  - Reopenings: 0.

- [2026-11-24] **[Read]**
  attachLabelTooltips delegates from one root; the rail controller on the sidebar claims rail events first, so the shell root adds no second sidebar controller.

- [2026-11-24] **[Verify]**
  New unit and e2e tooltip tests failed on main as expected; outputs recorded in validation-proof.md.

- [2026-11-24] **[Doc]**
  Documented label tooltips in ui-design.md App Shell and the visual style guide icon button entry, and added a CHANGELOG bullet.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

