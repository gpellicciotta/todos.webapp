---
id: T0256
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0256: Let users resize the task editor panel and the lists sidebar by dragging on desktop, remembered per device

## Goals
Let users drag the edges of the lists sidebar and the task editor panel to set their widths on desktop.
- The shell grid sizes both from `--width-sidebar` (16rem) and `--width-side-panel` (25rem).
- A separator on each inner edge resizes by pointer and by keyboard, within limits that keep the rows usable.
- Widths persist per device; double-click resets to the default.
- Compact layouts are unchanged.
- Rules and tests: [technical-spec.md](T0256-let-users-resize-the-task-editor-panel-and/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the grid tracks in the vendored shell.css, layout.js, and the preferences module.
- [ ] **[Doc]**       Add the resize rules to the UI design and the view preference key to the local store spec.
- [ ] **[Implement]** Author failing unit tests for the separators, limits, keyboard steps, persistence, and reset.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the separators and the width overrides on the app root.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Capture the separators at rest, hovered, focused, and dragged, in light and dark themes.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request for resizable panels.
