---
id: T0288
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
# T0288: Add the nav toggle and the icon rail of the wide sidebar to the wireframes that draw-wireframes.py renders

## Goals
Draw the nav toggle at the start of every wide frame's top bar, as T0287 added it and T0254 updates its glyphs.
Add a `nav-rail.svg` wireframe of All tasks with the sidebar as an icon rail: glyphs, list monograms, and a hovered label.
Show the hidden state in the same wireframe's caption or a second wide frame, whichever fits the script's layout.
Embed the new wireframe in ui-design.md and regenerate docs/img/ui with the script.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [ ] **[Read]**      Read draw-wireframes.py, its tests, and the nav toggle and rail sections of ui-design.md.
- [ ] **[Implement]** Write the tests of the technical spec.
- [ ] **[Verify]**    Run them and confirm they fail on main.
- [ ] **[Implement]** Draw the toggle and the rail, add nav-rail.svg, and regenerate docs/img/ui.
- [ ] **[Verify]**    Run the completion check and view the regenerated SVGs.
- [ ] **[Doc]**       Update ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Specified and moved to Next Milestone after T0254, which sets the toggle glyphs; T0286 waits on it.
