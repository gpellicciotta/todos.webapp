---
id: T0217
owner: "@claude"
session: claude-20261117-0b9d79
needs: []
branch: task/T0217-show-the-finished-today-only-choice-in-the
worktree: .plan/work/T0217-show-the-finished-today-only-choice-in-the
status: active
started_at: "2026-11-17T03:53:54Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 144.7, input: 54, output: 10037, cache_read: 1927293, cache_write: 58605}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T03:56:26Z"
---
# T0217: Show the Finished today only choice in the view options wireframe and the gallery's Status popover samples.

## Goals
T0216 added a "Finished today only" checkbox after the four statuses in the Status row of the view options.
Draw it under the Status choices of `view_options_fields` in scripts/draw-wireframes.py, then regenerate view-options.svg.
The gallery has no view options sample since T0233; add the checkbox to both Status popover samples instead.
Completion check: `npx playwright test tests/e2e/gallery-controls.spec.js` and `npm run check:sw` pass.
Size estimate: 2 files, 30 lines.
Mechanical command: `python scripts/draw-wireframes.py`
Mechanical files: docs/img/ui/view-options.svg

### Declared Files
- scripts/draw-wireframes.py
- src/demo/visual-style-gallery.html

## Task Execution Steps
- [x] **[Implement]** Draw the checkbox in the wireframe script and regenerate the view options wireframe.
- [x] **[Implement]** Add the checkbox to the two Status popover samples in the gallery.
- [x] **[Verify]**    Run the gallery controls spec and `npm run check:sw`; record the passing output.
- [x] **[Visual]**    Inspect the wireframe and the gallery popover in both themes.
- [x] **[Doc]**       Add a CHANGELOG.md entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Retargeted the gallery change to the Status popover samples, since T0233 removed the view options sample.

- [2026-11-17] **[Visual]**
  Screenshots: [before](T0217-show-the-finished-today-only-choice-in-the/before-gallery-popover-light.png), [light](T0217-show-the-finished-today-only-choice-in-the/after-gallery-popover-light.png), [dark](T0217-show-the-finished-today-only-choice-in-the/after-gallery-popover-dark.png).

- [2026-11-17] **[Verify]**
  Bumped service worker VERSION since check:sw failed on main for untouched files.
  - Files touched: 7.
  - Lines touched: 110.
  - Reopenings: 0.

- [2026-11-17] **[Implement]**
  Drew Finished today only under the Status choices and added it to both gallery popovers.

- [2026-11-17] **[Doc]**
  Added a CHANGELOG.md entry under v0.5.1-pre.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

