---
id: T0060
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
# T0060: Replace the top-bar More button with a floating New list button in the Lists view

## Goals
Remove the top-bar More button, which only holds New list, and its menu.
Show New list in the Lists view as a floating button fixed at the bottom right of the screen, above the content, in both layouts.
On compact layouts it sits above the bottom bar; it hides while an editor is open.
Redraw the wireframes: no vertical dots in the top bar, the Lists screens with the floating button, and no stray dots in task-editor.svg.
Completion check: `npm test`, `npm run lint`, `npx playwright test`, `python -m pytest`, and `npm run check:sw`.

## Task Execution Steps
- [ ] **[Read]**      Read layout.js, lists.js, the Lists screen design, and the layer tokens.
- [ ] **[Implement]** Author unit and end-to-end tests for the floating button and the removed More button.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Remove More; add the .fab component, its shell placement, and the Lists view button.
- [ ] **[Verify]**    Run unit, end-to-end, Python, lint, and service worker checks and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of Lists on compact and wide layouts.
- [ ] **[Doc]**       Update the gallery, style guide, UI design, wireframes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-06] **[Doc]**
  Companion task file scaffolded at task creation.
