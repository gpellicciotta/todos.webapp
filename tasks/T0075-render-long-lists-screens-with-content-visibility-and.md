---
id: T0075
owner: ~
needs: [T0074]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0075: Render long Lists screens with content-visibility and lazy row menus, with roving focus between rows

## Goals
Make long Lists screens cheap: `content-visibility: auto` rows, row menus built on first open, and roving focus between rows.
Follow ui-design.md, Many Lists: rendering, keyboard (`LST-15`, `TEC-16`).
Keep find in page, the tab order, and the restored scroll position true.

## Task Execution Steps
- [ ] **[Implement]** Author unit and e2e tests for lazy menus, roving focus, and scroll restore with 300 lists.
- [ ] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [ ] **[Implement]** Add `content-visibility` rows, build each row menu on first open, and add roving tabindex over rows.
- [ ] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [ ] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.
