---
task: T0076
round: 1
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-17T15:28:00Z
reviewed_commit: "ab269f8"
base_commit: "f2da857"
branch: task/T0076-add-move-to-top-and-move-to-bottom
session: claude-20261117-52b3fe
session_agent: claude-code
session_created_at: 2026-11-17T15:24:00Z
---
# Review Findings: Task T0076 (Round 1)

## Summary
Approved. The work meets every goal and its evidence holds up.
- The Lists row menu shows Move to top and Move to bottom before Delete list.
  The menu leaves out the end a row is already at, and hides both entries while reordering is locked.
  The List screen menu shows neither entry.
- Lists rows get Alt+Home and Alt+End by turning on reorder.js `ends`, so the code is reused, not duplicated.
  The menu entries call the same `jump`.
- The sidebar takes Alt+Home and Alt+End through `moveListToEnd`, keeps focus, scrolls the link into view, and announces the move.
- With reordering locked, Alt+Home and Alt+End announce "Reordering needs Manual order and no search."
- Settings lists Alt+Home and Alt+End, and its unit test covers the row.
  ui-design.md, the changelog, and the module comments are updated, and the service worker VERSION is bumped.

I re-ran these checks at `ab269f8`:
- `npx vitest run`: 65 files, 1744 tests passed.
- `npm run lint`: clean.
- `npm run check:sw`: "OK: 131 precached files match VERSION 2026-11-17.30."
- `npx playwright test tests/e2e/lists.spec.js tests/e2e/lists-find.spec.js tests/e2e/lists-many-rows.spec.js tests/e2e/sidebar-find.spec.js tests/e2e/list.spec.js`: 47 passed.
  This includes the new 124-list LST-13 scenario.

validation-proof.md has red-phase output for 11 unit tests and 2 e2e tests, plus green-phase output.
The screenshots show the new menu entries. I opened after-wide-dark.png myself.

## Defects
None.

## Process Gaps
- Non-blocking: the sidebar has no reorder lock while its find field filters.
  ui-design.md says the sidebar and the Lists screen share the "Reordering needs ... an empty field" rule.
  `onListKeydown` in `src/js/ui/layout.js` moves the list within the full order, even with a find text.
  Alt+Up and Alt+Down already behaved this way before this task, and Alt+Home and Alt+End now do the same.
  Consider a follow-up task that either adds the lock to the sidebar or exempts the sidebar in the spec.
- Non-blocking: the size grew past the estimate (7 files and 220 lines became 13 files and 330 lines).
  The Execution Log and technical-spec.md record the size note.

## Required Rework
None.
