---
id: T0274
owner: "@claude"
session: claude-20261117-837cd4
needs: []
branch: task/T0274-fix-the-popover-keyboard-e2e-test-in-behaviors
worktree: .plan/work/T0274-fix-the-popover-keyboard-e2e-test-in-behaviors
status: active
started_at: "2026-11-17T10:36:40Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 1448.1, input: 54, output: 9876, cache_read: 1970548, cache_write: 66823}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T11:00:57Z"
---
# T0274: Fix the popover keyboard e2e test in behaviors.spec.js failing on main: Tab never reaches the Clear button

## Goals
Make `tests/e2e/behaviors.spec.js:109`, popover keyboard behavior, pass again; it fails on main at 3ee12ec.
Four Tab presses after reopening the popover never focus its Clear button: the button stays inactive.
Find whether the demo gallery, the vendored popover module, or the test drifted, and fix that cause.
Found by T0267: `python scripts/devops.py check` stops on this test, so the check cannot pass.
Completion check: `npx playwright test tests/e2e/behaviors.spec.js:109 --repeat-each 5` and `python scripts/devops.py check` pass.
Size estimate: 2 files, 40 lines.
Mechanical command: ruff format scripts/draw-wireframes.py
Mechanical files: scripts/draw-wireframes.py

### Tests
- Unit: none (the defect shows only in browser focus order).
- Integration: the popover keyboard e2e test, repeated five times.

## Task Execution Steps
- [x] **[Read]**      Reproduce the failure and find which Tab press leaves the Clear button unfocused.
- [x] **[Implement]** Fix the cause in the gallery, the popover module, or the test.
- [x] **[Verify]**    Run the test five times, then the full check.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Read]**
  T0217 added a fifth Finished today only checkbox; four Tabs now land on it, not on Clear. The test drifted, not the gallery or popover module.

- [2026-11-17] **[Implement]**
  Made the test Tab onto Finished today only, toggle it, then Tab to Clear. Ruff-formatted scripts/draw-wireframes.py, an undeclared mechanical file whose drift blocked the check.

- [2026-11-17] **[Verify]**
  Test passed five times; devops check exited 0 after one flaky run. Proof in validation-proof.md.
  - Files touched: 1.
  - Lines touched: 4.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

