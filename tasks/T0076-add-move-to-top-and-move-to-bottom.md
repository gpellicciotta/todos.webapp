---
id: T0076
owner: "@claude"
session: claude-20261117-795fb0
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
- [x] **[Implement]** Author unit and e2e tests for the menu entries, the keys, the announcement, and the reorder lock.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add the two menu entries and Alt+Home and Alt+End, using `moveListTo` with the first and last index.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [x] **[Implement]** Add Alt+Home and Alt+End to the About shortcut list in settings.js, with its unit test.
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

- [2026-11-17] **[Verify]**
  New tests failed before the code existed: 11 unit tests and 2 e2e tests.
  - Missing moveListToEnd, menu entries, Alt+Home/End, shortcut row.

- [2026-11-17] **[Implement]**
  Added the menu entries, Alt+Home and Alt+End on Lists rows through reorder.js ends, the sidebar keys, and the locked announcement.

- [2026-11-17] **[Verify]**
  Unit suite, lint, check:sw, and 77 affected e2e tests passed; screenshots in screenshots/ show the new entries in both themes.
  - npm test: 1744 passed.
  - Playwright: 77 passed.

- [2026-11-17] **[Decided]**
  Bumped the service worker VERSION to 2026-11-17.30, since precached files changed.

- [2026-11-17] **[Doc]**
  Size note: 13 counted files and 330 lines; the extra files are small required edits that cannot merge apart.

- [2026-11-17] **[Visual]**
  Before and after screenshots: [before](T0076-add-move-to-top-and-move-to-bottom/screenshots/before-wide-light.png), [after](T0076-add-move-to-top-and-move-to-bottom/screenshots/after-wide-light.png); all eight are in validation-proof.md.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 13.
  - Lines touched: 330.
  - Reopenings: 0.

