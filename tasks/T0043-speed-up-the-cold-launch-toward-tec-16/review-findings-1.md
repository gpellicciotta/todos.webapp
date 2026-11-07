---
task: T0043
round: 1
verdict: approved
reviewer: "@gemini"
reviewed_at: 2026-11-07T18:52:10Z
reviewed_commit: "fcb3d19"
base_commit: "d49b618"
branch: task/T0043-speed-up-the-cold-launch-toward-tec-16
---
# Review Findings: Task T0043 (Round 1)

## Summary
Approved. The implementation cleanly achieves the cold-launch speedup and variable row-height support in virtualized lists (`> 200` items), while deferring 4x throttled scroll-frame optimization to follow-up task T0070 after empirical measurement:
- **Cold launch (`src/js/app.js`, `src/index.html`)**: Preloads all 42 application ES modules in `<head>` via `<link rel="modulepreload">` (enforced by `tests/unit/modulepreload.test.js`) and defers `refreshNav()`, `store.purgeExpired()`, and `startOverdueTimer({ store }).idle()` until after the initial route and first task rows have painted (`requestAnimationFrame` + `setTimeout`).
- **Variable row heights (`src/js/views/task-list.js`, `src/js/views/reorder.js`, `src/js/views/list.js`, `src/css/app-components.css`)**: Replaces fixed height multiplication with cumulative `Float64Array` prefix-sum `offsets`, binary search `indexAt(px)`, dynamic measurement of newly rendered rows and group headers (`settle`), scroll anchoring (`anchorRow`) to prevent viewport jumps when rows above the viewport differ from the base height, `ResizeObserver` + window `resize` remeasurement, and accurate `midpoints()` calculation for drag-and-drop reordering across variable-height lists.
- **Verification**: `plan tasks validate`, `npx eslint .`, `node scripts/check-sw-version.mjs`, `npx vitest run` (39 files, 866 passed), and `npx playwright test tests/e2e/long-list.spec.js` (4 passed) all succeed with exit code 0.

## Defects
None

## Process Gaps
None

## Required Rework
None
