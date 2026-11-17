---
id: T0274
owner: "@claude"
needs: []
branch: task/T0274-fix-the-popover-keyboard-e2e-test-in-behaviors
worktree: .plan/work/T0274-fix-the-popover-keyboard-e2e-test-in-behaviors
status: active
started_at: "2026-11-17T10:36:40Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0274: Fix the popover keyboard e2e test in behaviors.spec.js failing on main: Tab never reaches the Clear button

## Goals
Make `tests/e2e/behaviors.spec.js:109`, popover keyboard behavior, pass again; it fails on main at 3ee12ec.
Four Tab presses after reopening the popover never focus its Clear button: the button stays inactive.
Find whether the demo gallery, the vendored popover module, or the test drifted, and fix that cause.
Found by T0267: `python scripts/devops.py check` stops on this test, so the check cannot pass.
Completion check: `npx playwright test tests/e2e/behaviors.spec.js:109 --repeat-each 5` and `python scripts/devops.py check` pass.
Size estimate: 2 files, 40 lines.

### Tests
- Unit: none (the defect shows only in browser focus order).
- Integration: the popover keyboard e2e test, repeated five times.

## Task Execution Steps
- [ ] **[Read]**      Reproduce the failure and find which Tab press leaves the Clear button unfocused.
- [ ] **[Implement]** Fix the cause in the gallery, the popover module, or the test.
- [ ] **[Verify]**    Run the test five times, then the full check.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.
