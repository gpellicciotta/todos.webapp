---
id: T0217
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
# T0217: Show the Finished today only choice in the view options wireframe and the visual style gallery sample

## Goals
T0216 added a "Finished today only" checkbox after the four statuses in the Status row of the view options.
Add it to the Status region of docs/img/ui/view-options.svg, through scripts/draw-wireframes.py if that draws it.
Add it to the View options sample in src/demo/visual-style-gallery.html.
Completion check: npx playwright test tests/e2e/gallery.spec.js && npm run check:sw
Size estimate: 3 files, 30 lines

## Task Execution Steps
- [ ] **[Implement]** Implement required changes for T0217.
- [ ] **[Verify]**    Verify implementation with automated test suites.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.
