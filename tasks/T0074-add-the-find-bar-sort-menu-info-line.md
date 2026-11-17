---
id: T0074
owner: "@claude"
session: claude-20261117-485dda
needs: []
branch: task/T0074-add-the-find-bar-sort-menu-info-line
worktree: .plan/work/T0074-add-the-find-bar-sort-menu-info-line
status: active
started_at: "2026-11-17T04:38:01Z"
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
- [x] **[Implement]** Author unit and e2e tests for find, sort, persistence, Reset, Create list, and the reorder lock.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add the find bar, `todos.view.lists` sort, info line, no-match state, and the pinned compact bar.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [x] **[Implement]** Add the Lists screen `/` row to the About shortcut list in settings.js, with its unit test.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-09] **[Decided]**
  Added a step to list the new shortcut in Settings About, which T0214 creates.

- [2026-11-17] **[Implement]**
  Added list-sort persistence, the Lists screen find block, sort menu, info line, Create list offer, reorder lock, CSS, Settings / row, docs, changelog, and SW VERSION bump. Proof in validation-proof.md.

- [2026-11-17] **[Verify]**
  Unit tests failed before the code (17 failed); after it npm test, npm run lint, check:sw, and the e2e specs pass.

- [2026-11-17] **[Doc]**
  Updated ui-design.md, CHANGELOG.md, and the lists module comments.

- [2026-11-17] **[Decided]**
  Full e2e run showed behaviors.spec.js popover keyboard test failing also on the clean baseline; left untouched. Fixed the stale bin-settings shortcut expectations.

