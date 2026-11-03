---
id: T0005
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: suspended
started_at: "2026-11-03T21:28:15Z"
ended_at: —
review: human
preview: none
protocol: standard
review_status: pending
review_round: 2
---
# T0005: Draw a low-fidelity SVG wireframe per screen of docs/specs/ui-design.md, showing 390 px and 1440 px side by side

## Goals
Draw one low-fidelity SVG wireframe per screen of docs/specs/ui-design.md under docs/img/ui/.
Each SVG shows the 390 px compact and the 1440 px wide layout side by side.
A committed script draws all SVGs, so redesigns regenerate them instead of hand edits.
Link each wireframe from ui-design.md and add a CHANGELOG.md entry.
See technical-spec.md for files, size, screens, and tests.

## Task Execution Steps
- [x] **[Read]**      Read docs/specs/ui-design.md and docs/specs/visual-style-guide.md.
- [x] **[Implement]** Write tests/test_draw_wireframes.py for the output checks listed in technical-spec.md.
- [x] **[Verify]**    Run the tests and confirm they fail because the script is missing.
- [x] **[Implement]** Write scripts/draw-wireframes.py drawing every screen in both layouts.
- [x] **[Verify]**    Run the tests, ruff, and the markdown linter, and confirm all pass.
- [x] **[Visual]**    Render every SVG to PNG and inspect each for overlaps and clipping.
- [x] **[Doc]**       Link each wireframe from ui-design.md, document the command, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-03] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-03] **[Review]**
  Review raised from agent to human.

- [2026-11-03] **[Verify]**
  Red phase: all 38 tests errored because scripts/draw-wireframes.py did not exist yet.

- [2026-11-03] **[Implement]**
  Wrote the wireframe script; the frame bounds test caught four overflows, fixed before review.

- [2026-11-03] **[Visual]**
  Rendered all 12 SVGs with Chromium without console errors and inspected each render.
  - Renders: renders/ beside this task file.

- [2026-11-03] **[Doc]**
  Size note: 1212 changed lines pass the large line, below three times the 800-line estimate.
  - Undeclared files: ruff.toml and .gitignore.
  - Ruff format expanded the script to 1028 lines.

- [2026-11-03] **[Verify]**
  Recorded task outcomes.
  - Files touched: 7.
  - Lines touched: 1212.
  - Reopenings: 0.

- [2026-11-03] **[Review]**
  Round 1 requested (mode: human).

- [2026-11-03] **[Review]**
  Round 1 rejected by @gpellicciotta: Approve after remarks: list editor as right panel and full screen, status popup and icons, sidebar sync alignment, add bar on top, notes order, settings card.

- [2026-11-03] **[Implement]**
  Applied review round 1 remarks to the specs and the script, and regenerated all wireframes.
  - List editor uses the editor panel.
  - Status menu, dash icon, cancelled strike-through.
  - Notes newest first; NOT-3 updated.

- [2026-11-03] **[Visual]**
  Re-rendered all 12 SVGs without console errors and inspected the reworked screens.

- [2026-11-03] **[Doc]**
  Size note: rework added about 220 counted lines, plus requirements.md and visual-style-guide.md as undeclared files.

- [2026-11-03] **[Review]**
  Round 2 requested (mode: human).

