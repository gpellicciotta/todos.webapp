---
id: T0281
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0281: Fix the gallery toast e2e test's live-region locator and the Settings shortcut list e2e test, both failing on main

## Goals
Make two e2e tests that fail on main at 6503ee0 pass again, found during T0262.
- `behaviors-dialog.spec.js:77`: `[aria-live="polite"]` also matches the gallery's `.task-editor__count` live region; scope it to the toast live region.
- `bin-settings.spec.js:296`: the expected shortcut terms predate T0263 and T0076; match the Settings list or fix the list.
Completion check: `npx playwright test tests/e2e/behaviors-dialog.spec.js tests/e2e/bin-settings.spec.js` passes.
Size estimate: 2 files, 20 lines.

### Declared Files
- tests/e2e/behaviors-dialog.spec.js
- tests/e2e/bin-settings.spec.js

### Tests
- Unit test: none (end-to-end test fixes only).
- Integration: the two named specs pass.

## Task Execution Steps
- [ ] **[Implement]** Implement required changes for T0281.
- [ ] **[Verify]**    Verify implementation with automated test suites.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.
