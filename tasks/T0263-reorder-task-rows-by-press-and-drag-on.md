---
id: T0263
owner: "@claude"
session: claude-20261117-41471b
needs: []
branch: task/T0263-reorder-task-rows-by-press-and-drag-on
worktree: .plan/work/T0263-reorder-task-rows-by-press-and-drag-on
status: active
started_at: "2026-11-17T13:48:25Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1832.0, input: 10, output: 1841, cache_read: 650499, cache_write: 6427}
work_duration: 1920.3
---
# T0263: Reorder task rows by press-and-drag on desktop, long hold on touch, and Alt keys, with an outside handle

## Goals
Replace the always-visible task row drag handles with direct reordering, by the Task Reordering rules in T0257's brief.
- Desktop: press and drag the row; a handle shows outside the row, in the gutter, on the focused or hovered row.
- Touch: a long hold on the row starts the drag, while a swipe still scrolls.
- Keyboard: Alt+Up and Alt+Down move one place; Alt+Home and Alt+End move to the top or bottom.
- Moves still apply only under manual order without grouping or search (`LV-8`).
- Move up and Move down stay in the More menu until T0265.
- Rules and tests: [technical-spec.md](T0263-reorder-task-rows-by-press-and-drag-on/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read T0257's signed-off brief, reorder.js, and the row handle and Alt key code in task-list.js.
- [x] **[Implement]** Author failing unit and e2e tests for press-and-drag, long hold, the outside handle, and Alt keys.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement row drags, the long hold, the outside handle, and Alt+Home and Alt+End.
- [x] **[Verify]**    Run the unit suite and the list e2e spec and confirm they pass.
- [x] **[Visual]**    Capture the focused row's outside handle and a drag in progress, in both themes.
- [x] **[Doc]**       Update the List screen and Accessibility sections, LV-3, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the row layout and reordering agreed in T0257.

- [2026-11-17] **[Decided]**
  Added press and ends options to reorder.js instead of a jump callback; the Lists screen keeps handle-only drags until T0076.

- [2026-11-17] **[Decided]**
  Kept search from disabling moves, as today and per LV-8; aligned ui-design.md wording.

- [2026-11-17] **[Verify]**
  Unit suite and list, gallery, and lists e2e specs pass; screenshots and proof in validation-proof.md.
  - npm test: 1734 passed.
  - e2e: 51 passed.
  - Pre-existing toast test failure tracked as T0279.

- [2026-11-17] **[Doc]**
  Size note: 11 counted files, 619 lines; one gesture feature spanning reorder.js, styles, tests, and docs, not split usefully.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 619.
  - Reopenings: 0.

