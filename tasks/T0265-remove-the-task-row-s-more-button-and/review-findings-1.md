---
task: T0265
round: 1
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-17T16:40:30Z
reviewed_commit: "5fc41cf"
base_commit: "031e3cf"
branch: task/T0265-remove-the-task-row-s-more-button-and
session: claude-20261117-2e5e3c
session_agent: claude-code
session_created_at: 2026-11-17T16:36:15Z
---
# Review Findings: Task T0265 (Round 1)

## Summary
The work meets every goal and technical-spec rule.
- `task-list.js` drops the More button, the shared menu, its five entries, and the menu focus memo.
- `isLocked` replaces `accessOf`; `moves.step` leaves `list.js`, while `reorder.js` keeps `step` for the Alt keys.
- CSS drops the `.task-row__more` rules in `app-components.css` and `views.css`.
- TSK-8 and TSK-11 name the editor; LV-3 already named only drags and Alt keys.
- The ui-design principle now asks drags for a keyboard alternative only.
- The Accessibility section names the Alt keys for tasks.
- Task Row, Task Reordering, the windowing notes, and the visual style guide drop the row menu.
- The e2e specs delete from the editor with Undo and Ctrl+Z, and remove from a list in the Status tab.

Reviewer reruns at `5fc41cf`:
- `npm test`: 65 files, 1747 tests passed.
- `npx eslint .`: exit 0.
- `node scripts/check-sw-version.mjs`: OK, 132 files match VERSION 2026-11-17.32.
- `npx playwright test` on the all-tasks, list, sharing, gallery-app, and task-editor specs: 98 passed, exit 0.
- Before and after list screenshots at 360 px light match the claim: the trailing "…" buttons are gone.

The three full-suite e2e failures predate this branch, and follow-up T0282 tracks them.
I did not rerun the full suite.

## Defects
None.

## Process Gaps
- Non-blocking: two doc comments still name the removed Move up and Move down entries.
  - `src/js/views/list.js:8` says manual order "offers Move up and Move down".
  - `src/js/views/reorder.js:3` lists "and Move up and Move down" among the reordering inputs.
  - Neither entry exists in any task row or Lists row now; both lines should drop the phrase.

## Required Rework
None.
