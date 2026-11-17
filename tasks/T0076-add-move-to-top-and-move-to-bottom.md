---
id: T0076
owner: "@claude"
needs: []
branch: task/T0076-add-move-to-top-and-move-to-bottom
worktree: .plan/work/T0076-add-move-to-top-and-move-to-bottom
status: active
started_at: "2026-11-17T15:09:28Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0076: Add Move to top and Move to bottom to the Lists screen menu and Alt+Home and Alt+End in both list surfaces.

## Goals
Add Move to top and Move to bottom to the Lists screen row menu, and Alt+Home and Alt+End to both list surfaces.
T0257 replaced the planned Alt+Shift+Up and Alt+Shift+Down with Alt+Home and Alt+End, matching task rows.
Follow ui-design.md, Many Lists: reordering at scale (`LST-13`).
Announce each move and keep focus on the row, scrolled into view.
The Lists screen reorders through reorder.js, which T0263 rewrites; reuse its Alt+Home and Alt+End instead of duplicating them.

## Task Execution Steps
- [ ] **[Implement]** Author unit and e2e tests for the menu entries, the keys, the announcement, and the reorder lock.
- [ ] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [ ] **[Implement]** Add the two menu entries and Alt+Home and Alt+End, using `moveListTo` with the first and last index.
- [ ] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [ ] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Implement]** Add Alt+Home and Alt+End to the About shortcut list in settings.js, with its unit test.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-09] **[Decided]**
  Added a step to list the new shortcut in Settings About, which T0214 creates.

- [2026-11-16] **[Doc]**
  Replaced the Alt+Shift end keys with Alt+Home and Alt+End, as decided in T0257.


- [2026-11-16] **[Decided]**
  Made T0076 wait for T0263, which adds Alt+Home and Alt+End to the shared reorder.js.
