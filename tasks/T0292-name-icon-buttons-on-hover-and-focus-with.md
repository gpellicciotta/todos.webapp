---
id: T0292
owner: "@claude"
needs: []
branch: task/T0292-name-icon-buttons-on-hover-and-focus-with
worktree: .plan/work/T0292-name-icon-buttons-on-hover-and-focus-with
status: active
started_at: "2026-11-24T13:58:20Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0292: Name icon buttons on hover and focus with the vendored label tooltips instead of native titles

## Goals
Attach the vendored `attachLabelTooltips` once to the app shell, so every `.icon-button` shows its name on hover and focus.
Today most icon buttons show nothing on hover, and a few repeat their name in a native `title`.
Drop `title` where it only repeats the accessible name: the inbox button and the Lists add button.
Keep `title` hints that say more than the name, such as task status buttons; those controls skip the tooltip.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [ ] **[Read]**      Read attachLabelTooltips in the vendored tooltip.js and every icon button with a title.
- [ ] **[Implement]** Write the unit and e2e tests of the technical spec.
- [ ] **[Verify]**    Run them and confirm they fail on main.
- [ ] **[Implement]** Attach the label tooltips in the shell and drop the titles that repeat names.
- [ ] **[Verify]**    Run the completion check and capture before and after screenshots of a hovered button.
- [ ] **[Doc]**       Update the UI design spec, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.
