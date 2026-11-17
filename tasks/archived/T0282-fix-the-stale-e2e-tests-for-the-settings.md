---
id: T0282
owner: "@claude"
session: claude-20261117-befa4b
needs: []
branch: task/T0282-fix-the-stale-e2e-tests-for-the-settings
worktree: .plan/work/T0282-fix-the-stale-e2e-tests-for-the-settings
status: cancelled
started_at: "2026-11-17T20:08:55Z"
ended_at: "2026-11-17T20:50:26Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 91.9, input: 28, output: 5118, cache_read: 835567, cache_write: 45902}
work_duration: 101.8
---
# T0282: Fix the stale e2e tests for the Settings shortcuts list and the gallery toast live region

## Goals
Fix three e2e tests that fail on main since T0076 and T0262, found during T0265.
- `bin-settings.spec.js` expects 9 shortcut rows; T0076 added Alt+Home and Alt+End to settings.js.
- `behaviors-dialog.spec.js` toast test matches two `aria-live="polite"` elements in the gallery.
  The second is the `task-editor__count` specimen T0262 added; scope the locator to the toast region.
- Change tests only; keep app behavior unchanged.
Completion check: `npx playwright test tests/e2e/bin-settings.spec.js tests/e2e/behaviors-dialog.spec.js` passes.
Size estimate: 2 files, 10 lines.

### Declared Files
- tests/e2e/bin-settings.spec.js
- tests/e2e/behaviors-dialog.spec.js

## Task Execution Steps
- [ ] **[Implement]** Implement required changes for T0282.
- [ ] **[Verify]**    Verify implementation with automated test suites.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Verify]**
  Found both fixes already on main from T0283 commit 0be6585, including CHANGELOG line 14; completion check passes unchanged.
  - 17 of 17 e2e tests passed, exit 0.
  - Proof recorded in validation-proof.md.

- [2026-11-17] **[Review]**
  Needs human decision: T0283 superseded this task, leaving an empty branch; recommend cancelling it as superseded.
  - Files touched: 0.
  - Lines touched: 0.
  - Reopenings: 0.

- [2026-11-17] **[Cancelled]**
  Superseded by T0283, which already fixed both e2e specs.

