---
id: T0265
owner: "@claude"
session: claude-20261117-7af215
needs: []
branch: task/T0265-remove-the-task-row-s-more-button-and
worktree: .plan/work/T0265-remove-the-task-row-s-more-button-and
status: active
started_at: "2026-11-17T16:10:37Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 1518.2, input: 226, output: 64542, cache_read: 21036557, cache_write: 231881}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T16:36:14Z"
---
# T0265: Remove the task row's More button and menu, now that the editor and the move keys cover them

## Goals
Remove the row's More button and menu, by the Task Row Layout rules in T0257's signed-off brief.
- Add to list and Remove from this list live in the Lists section of the editor's Status tab.
- Delete lives at the bottom of the editor's Status tab once T0262 lands, and at the editor's bottom before that.
- Move up and Move down give way to the drags and Alt keys of T0263.
- Rules and tests: [technical-spec.md](T0265-remove-the-task-row-s-more-button-and/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read T0257's signed-off brief, the More menu code in task-list.js, and its tests.
- [x] **[Implement]** Change the unit and e2e tests to expect no More button, and move their flows to the editor.
- [x] **[Verify]**    Run the changed tests and confirm they fail while the More menu still exists.
- [x] **[Implement]** Remove the More button, its menu, its entries, and its styles.
- [x] **[Verify]**    Run the unit suite and the All tasks and list e2e specs and confirm they pass.
- [x] **[Visual]**    Capture rows without the More button at 360 and 1440 px, in both themes.
- [x] **[Doc]**       Update the Task Row and List sections, the requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the row layout and reordering agreed in T0257.

- [2026-11-17] **[Implement]**
  Removed the row More button, menu, entries, and styles; tests now delete and remove from lists in the editor.

- [2026-11-17] **[Verify]**
  Red phase failed 5 unit and 4 e2e tests; green phase passed 1747 unit and 98 affected e2e tests.
  - Full e2e: 266 passed, 3 failures predating this branch.
  - Follow-up T0282 fixes those three stale tests.

- [2026-11-17] **[Visual]**
  Captured All tasks and list rows at 360 and 1440 px in both themes, before and after; see validation-proof.md.
  - [Before, list 1440 light](T0265-remove-the-task-row-s-more-button-and/before-list-1440-light.png)
  - [After, list 1440 light](T0265-remove-the-task-row-s-more-button-and/after-list-1440-light.png)

- [2026-11-17] **[Doc]**
  Size note: 16 files, 665 lines, mostly deletions; each extra file only drops a More reference, so no piece merges alone.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 16.
  - Lines touched: 665.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

