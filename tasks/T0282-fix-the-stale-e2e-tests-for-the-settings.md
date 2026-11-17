---
id: T0282
owner: "@claude"
needs: []
branch: task/T0282-fix-the-stale-e2e-tests-for-the-settings
worktree: .plan/work/T0282-fix-the-stale-e2e-tests-for-the-settings
status: active
started_at: "2026-11-17T20:08:55Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
