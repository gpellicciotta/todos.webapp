---
id: T0005
owner: ~
needs: [T0002]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
---
# T0005: Draw a low-fidelity SVG wireframe per screen of docs/specs/ui-design.md, showing 390 px and 1440 px side by side

## Goals
Draw one low-fidelity SVG wireframe per screen of docs/specs/ui-design.md under docs/img/ui/.
Each SVG shows the 390 px compact and the 1440 px wide layout side by side.
Use gray boxes and labels only, no colors or fonts from the design system.
Link each wireframe from its screen section in ui-design.md and add a CHANGELOG.md entry.
Completion check: `python ../dev-guidelines/scripts/lint-markdown.py check docs`, then human review of the SVGs.

### Declared Files
- docs/specs/ui-design.md
- CHANGELOG.md
- docs/img/ui/*.svg, one per screen: about 10 files.

Size estimate: 12 files, 900 lines
Size note: SVG files count as hand-edited; above the typical line, since splitting screens adds no value.

## Task Execution Steps
- [ ] **[Read]**      Read docs/specs/ui-design.md and docs/specs/visual-style-guide.md.
- [ ] **[Doc]**       Draw one SVG wireframe per screen, compact and wide layouts side by side.
- [ ] **[Doc]**       Link each wireframe from ui-design.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-03] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-03] **[Review]**
  Review raised from agent to human.

