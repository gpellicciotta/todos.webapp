---
task: T0263
round: 1
verdict: rejected
blocking: 2
reviewer: "@codex"
reviewed_at: 2026-11-17T14:22:02Z
reviewed_commit: "26d9f41"
base_commit: "23563c4"
branch: task/T0263-reorder-task-rows-by-press-and-drag-on
---
# Review Findings: Task T0263 (Round 1)

## Summary
Rejected for two blocking defects: a stale mouse press starts an unpressed drag, and search leaves reordering enabled.
Reviewed both commits and the complete diff against main.

Independent checks passed:

- Affected unit tests: 107 passed across reorder, task-list, and list suites.
- List browser tests: 18 passed in 1.0 minute.
- ESLint: exit 0.
- Service-worker check: exit 0; 131 precached files matched version 2026-11-17.27.

Commands:

```text
npx vitest run tests/unit/reorder.test.js tests/unit/task-list.test.js tests/unit/list.test.js
npx playwright test tests/e2e/list.spec.js
npx eslint .
npm run check:sw
```

All commands and the separate Chromium probe finished before this verdict.

## Defects

- D1, blocking: Pending mouse presses survive release outside the list.
  In src/js/views/reorder.js:276-296, advance starts dragging without checking whether the button remains pressed.
  Pointer-up cancellation listens only on the list at line 449; pending presses have no pointer capture.
  Reproduction: press near a row edge, move directly outside the list, release, then hover back over the row.
  Actual: the row starts dragging with no button held, follows the pointer, and can swallow the next click.
  Expected: releasing anywhere cancels the pending press.
  A real Chromium probe loaded the production module and performed these mouse actions without synthetic pointer events.
  Its output was:

  ```text
  Dragging rows after release outside list and unpressed re-entry: 1
  ```

- D2, blocking: Search does not disable reordering as the task Goals and T0257 signed-off brief require.
  In src/js/views/list.js:123, moves.enabled checks permissions, manual sort, and grouping, but never search.
  The implementation explicitly retains this behavior and changes ui-design.md to remove the search restriction.
  The companion decision cites existing LV-8 behavior, which does not authorize overriding this task's explicit acceptance criterion.
  Expected: active search disables pointer, touch, keyboard, and menu moves.

## Process Gaps

- Non-blocking: Recorded visual evidence covers desktop light and dark themes only.
  Touch holds have unit coverage, but the implementation explicitly records no touch browser or device verification.
  Synthetic pointer tests cannot establish actual scrolling, native gesture cancellation, or touch link behavior.

## Required Rework

- D1: Cancel pending presses on outside release and pointer cancellation; reject mouse movement without an active primary button.
  Add a browser regression covering outside release and unpressed re-entry, while preserving ordinary clicks and valid drags.
- D2: Disable every move path during search and restore matching documentation; add search-specific regression coverage.
  Alternatively, a human must explicitly approve changing the task goal and signed-off brief to permit search reordering.
