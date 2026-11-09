---
id: T0073
owner: ~
needs: ['T0072', 'T0214']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0073: Add the find field, roving focus, and the l shortcut to the sidebar lists

## Goals
Add the find field to the sidebar from 12 lists, with roving focus and the `l` shortcut.
Follow ui-design.md, Sidebar With Many Lists and Many Lists: name matching, "4 of 124", Enter, Escape, and Down (`LST-10`, `LST-15`).
Announce the match count through the polite live region after typing pauses for 150 ms.

## Task Execution Steps
- [ ] **[Implement]** Author unit and e2e tests for the field, matching, keys, the shortcut, and the announcement.
- [ ] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [ ] **[Implement]** Add the sidebar find field, the filter, roving tabindex, the `l` shortcut, and the live announcement.
- [ ] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [ ] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Implement]** Add the `l` row to the About shortcut list in settings.js, with its unit test.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-09] **[Decided]**
  Added a step to list the new shortcut in Settings About, which T0214 creates.

