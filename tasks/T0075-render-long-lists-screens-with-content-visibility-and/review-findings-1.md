---
task: T0075
round: 1
verdict: rejected
blocking: 2
reviewer: "@codex"
reviewed_at: 2026-11-17T05:04:11Z
reviewed_commit: "8e763c6"
base_commit: "b3ae9df"
branch: task/T0075-render-long-lists-screens-with-content-visibility-and
session: codex-20261117-3cb8b3
session_agent: codex
session_created_at: 2026-11-17T05:02:52Z
---
# Review Findings: Task T0075 (Round 1)

## Summary
**[Decided]** Rejected for two blocking keyboard and accessibility defects.
Reviewed the task, companion specification, execution evidence, commit log, and complete branch diff.
Lazy menu construction, content visibility, basic arrow navigation, and Back restoration passed the affected automated checks.

Independent checks completed successfully:
- `npx vitest run tests/unit/lists-many-rows.test.js tests/unit/lists.test.js`: exit 0; 33 tests passed.
- `npm run lint`: exit 0.
- `npm run check:sw`: exit 0; 130 precached files matched.
- `npx playwright test tests/e2e/lists-many-rows.spec.js tests/e2e/lists.spec.js`: exit 0; 14 tests passed.

## Defects
- Blocking D1: Required navigation keys are missing in `src/js/views/lists.js`, function `roveRows`.
  The companion specification explicitly requires Home, End, PageUp, and PageDown to move the single row tab stop.
  The implementation handles only Up, Down, Right, and Left.
  An independent happy-dom probe focused row index 5 and dispatched each required key.
  Every key left focus at index 5 and returned `defaultPrevented: false`.
  Browser scrolling can therefore move independently of the focused row.
- Blocking D2: Unopened More buttons lose menu semantics in `src/js/views/lists.js`, function `row`.
  Previously, `attachMenu` supplied `aria-haspopup="menu"` and the popover state during rendering.
  Those attributes now appear only after activation calls `ensureMenu`.
  An independent mounted-screen probe returned null for both `aria-haspopup` and `aria-expanded` before first open.
  Assistive technology cannot identify these controls as collapsed menu buttons when users first encounter them.
  Lazy menu content does not require delaying the trigger's accessibility semantics.

## Process Gaps
- Non-blocking: The companion requires browser find to discover a distant name; no corresponding test or evidence was supplied.
- Non-blocking: No before/after screenshots or visual verification evidence were supplied.
- Non-blocking: Validation proof omits command exit codes and the required Walkthrough & Validation heading.
  Its abbreviated failing-first output does not identify the failed assertions.
- Non-blocking: No throttled opening-budget measurement or 150-versus-500-list comparison evidence was supplied.

## Required Rework
- Implement and test Home, End, PageUp, and PageDown navigation as required by the companion specification.
  Alternatively, obtain an explicit human decision changing that requirement before approval.
- Set appropriate collapsed menu-button semantics before first activation while retaining lazy menu construction.
  Add regression coverage for unopened triggers and their state after opening and closing.
- Rerun the affected unit and browser checks and record their results.
