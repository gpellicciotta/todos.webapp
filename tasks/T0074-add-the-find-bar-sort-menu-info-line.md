---
id: T0074
owner: ~
needs: [T0071]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0074: Add the find bar, sort menu, info line, and Create list offer to the Lists screen

## Goals
Add the find bar, the sort menu, the info line, and the Create list offer to the Lists screen from 12 lists.
Follow ui-design.md, Lists Overview, Many Lists, and the wireframes lists-many.svg and lists-find.svg (`LST-10`, `LST-11`, `LST-12`).
Hide reordering while a sort or find text is active, and announce why.

## Task Execution Steps
- [ ] **[Implement]** Author unit and e2e tests for find, sort, persistence, Reset, Create list, and the reorder lock.
- [ ] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [ ] **[Implement]** Add the find bar, `todos.view.lists` sort, info line, no-match state, and the pinned compact bar.
- [ ] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [ ] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.
