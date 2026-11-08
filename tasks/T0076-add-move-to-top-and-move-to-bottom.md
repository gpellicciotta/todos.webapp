---
id: T0076
owner: ~
needs: [T0072, T0074]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0076: Add Move to top and Move to bottom to the Lists screen menu and Alt+Shift+arrow keys in both list surfaces

## Goals
Add Move to top and Move to bottom to the Lists screen row menu, and Alt+Shift+Up and Alt+Shift+Down to both list surfaces.
Follow ui-design.md, Many Lists: reordering at scale (`LST-13`).
Announce each move and keep focus on the row, scrolled into view.

## Task Execution Steps
- [ ] **[Implement]** Author unit and e2e tests for the menu entries, the keys, the announcement, and the reorder lock.
- [ ] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [ ] **[Implement]** Add the two menu entries and the Alt+Shift keys, using `moveListTo` with the first and last index.
- [ ] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [ ] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.
