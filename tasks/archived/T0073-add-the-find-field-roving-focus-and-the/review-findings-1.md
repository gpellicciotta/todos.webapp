---
task: T0073
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T04:34:38Z
reviewed_commit: "65f688a"
base_commit: "1eb3f03"
branch: task/T0073-add-the-find-field-roving-focus-and-the
session: codex-20261117-e7b5a0
session_agent: codex
session_created_at: 2026-11-17T04:33:21Z
---
# Review Findings: Task T0073 (Round 1)

## Summary
Rejected for one unmet shortcut requirement. Filtering, roving focus, and the affected automated checks otherwise pass.

Reviewer checks, all exit 0:
- `npx vitest run tests/unit/layout-find.test.js tests/unit/layout.test.js tests/unit/settings.test.js`: 3 files, 88 tests passed.
- `npm run lint`: no diagnostics.
- `npx playwright test tests/e2e/sidebar-find.spec.js tests/e2e/shell.spec.js`: 31 passed (19.9s).

The browser runner completed and managed its own server lifecycle.
Command: `npx playwright test tests/e2e/sidebar-find.spec.js tests/e2e/shell.spec.js`; runner identifier: 23006; server PID: 20772.
Recorded full-suite evidence reports 63 files and 1647 tests passed; the reviewer reran affected suites only.

## Defects
- Blocking D1: The `l` shortcut fails to open Lists when the sidebar find field is unavailable.
  In src/js/app.js:287-294, the handler only focuses a visible field and otherwise returns without navigation.
  The technical specification requires routing to `#/lists` when the field is absent or the layout is compact.
  The existing Accessibility and Input specification also requires this fallback.
  From All tasks with five lists, pressing `l` therefore leaves the user on All tasks.
  The same failure occurs on compact layouts, even with twelve or more lists.
  The new sidebar-find browser test instead asserts the no-op behavior below twelve lists.
  The added Sidebar With Many Lists documentation contradicts the retained accessibility requirement and task specification.

## Process Gaps
- Non-blocking: No before/after screenshots or light/dark responsive visual verification evidence exists in the companion directory.
  The testing guidelines require these for rendered changes. This gap does not independently reject the deliverable.

## Required Rework
- Restore the specified `l` fallback to Lists when the sidebar field cannot receive focus.
- Add regression coverage below twelve lists and on compact layouts; retain coverage for focusing the visible field.
- Align the sidebar documentation with the existing fallback requirement.
