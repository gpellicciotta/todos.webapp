---
id: T0289
owner: ~
needs: ['T0254']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read panel-resize.js, the attachAppNav wiring in layout.js, and the rail track in the vendored shell.css.
- [ ] **[Implement]** Write the unit and e2e tests of the technical spec.
- [ ] **[Verify]**    Run them and confirm they fail on main.
- [ ] **[Implement]** Measure the shown sidebar width for the editor limits and refresh them on nav state changes.
- [ ] **[Verify]**    Run the completion check.
- [ ] **[Doc]**       Update the UI design spec and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Specified and moved to Next Milestone after T0254, which changes the nav toggle; T0286 waits on it.
