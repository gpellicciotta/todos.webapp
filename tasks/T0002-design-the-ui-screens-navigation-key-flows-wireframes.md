---
id: T0002
owner: ~
needs: [T0001]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
---
# T0002: Design the UI: screens, navigation, key flows, wireframes, and the visual style guide

## Goals
Design the web app UI from the approved docs/requirements.md.
Decide whether to reuse the support.js product family design system, as the UI guidelines prefer, and record why.
Write docs/specs/ui-design.md with screens, navigation, and key flows, including offline use, connecting, syncing, and conflicts.
Draw a low-fidelity SVG wireframe per screen at 390 px and 1440 px widths under docs/img/ui/.
Write docs/specs/visual-style-guide.md naming the design system, its version, and planned local additions.
Completion check: `python ../dev-guidelines/scripts/lint-markdown.py check docs`, then human review.

### Declared Files
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- docs/index.md
- CHANGELOG.md
- docs/img/ui/*.svg, one per screen and width; the count follows from the screen list.

Size estimate: 4 files, 400 lines, plus wireframes

## Task Execution Steps
- [ ] **[Read]**      Read docs/requirements.md, the UI guidelines, and the support.js visual style guide.
- [ ] **[Decide]**    Decide between reusing the support.js design system and creating a new one.
- [ ] **[Doc]**       Write ui-design.md with screens, navigation, and the flows listed in technical-spec.md.
- [ ] **[Doc]**       Draw a wireframe for every screen at 390 px and 1440 px widths.
- [ ] **[Doc]**       Write visual-style-guide.md, link both specs from docs/index.md, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain human review approval of the design before completion.

## Execution Log
- [2026-11-03] **[Doc]**
  Companion task file scaffolded at task creation.
