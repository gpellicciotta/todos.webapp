---
id: T0002
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: suspended
started_at: "2026-11-03T20:41:58Z"
ended_at: —
review: human
preview: none
protocol: standard
review_status: pending
review_round: 1
---
# T0002: Design the UI: screens, navigation, key flows, wireframes, and the visual style guide

## Goals
Design the web app UI from the approved docs/requirements.md.
Decide between creating a new design system and reusing the family-portal one, and record why.
Write docs/specs/ui-design.md with screens, navigation, and key flows, including offline use, connecting, syncing, and conflicts.
Write docs/specs/visual-style-guide.md naming the design system, its version, and planned local additions.
Completion check: `python ../dev-guidelines/scripts/lint-markdown.py check docs`, then human review.

### Declared Files
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- docs/index.md
- CHANGELOG.md

Size estimate: 4 files, 400 lines
Size note: wireframes moved to T0005, since 20 SVG files would pass the large line.

## Task Execution Steps
- [x] **[Read]**      Read docs/requirements.md, the UI guidelines, and the family-portal visual style guide.
- [x] **[Decide]**    Decide between reusing the family-portal design system and creating a new one.
- [x] **[Doc]**       Write ui-design.md with screens, navigation, and the flows listed in technical-spec.md.
- [x] **[Doc]**       Write visual-style-guide.md, link both specs from docs/index.md, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-03] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-03] **[Decided]**
  User chose a new design system: monochrome with one violet signal, self-hosted Inter, and compact rows.

- [2026-11-03] **[Doc]**
  Wrote ui-design.md and visual-style-guide.md, linked both from the index; split wireframes into T0005.
  - Lint: all 5 markdown files passed.

- [2026-11-03] **[Doc]**
  Size note: 444 changed lines cross the typical line; the two specs belong together and stay in one task.

- [2026-11-03] **[Verify]**
  Recorded task outcomes.
  - Files touched: 4.
  - Lines touched: 444.
  - Reopenings: 0.

- [2026-11-03] **[Review]**
  Round 1 requested (mode: human).

