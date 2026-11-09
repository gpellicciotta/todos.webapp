---
id: T0215
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-09T22:50:21Z"
ended_at: "2026-11-09T23:07:28Z"
review: none
preview: none
protocol: adhoc
completion-commit: 20a80b114192bf1048399ff6e8706ed1a30ea175
---
# T0215: Keep focus in the add field after adding a task on wide screens, while the task editor still opens

## Goals
Keep focus in "Search or add a task" after an add on wide screens, so several tasks can be added in a row.
The task editor still opens for the new task; compact screens keep giving it the focus.
Details, declared files, size, and tests live in [technical-spec.md](T0215-keep-focus-in-the-add-field-after-adding/technical-spec.md).

## Task Execution Steps
- [x] **[Implement]** Author unit tests for editor focus, add bar refocus, and both screens.
- [x] **[Implement]** Update the e2e specs for wide and compact focus after an add.
- [x] **[Verify]**    Run the new tests and record their failure before the fix.
- [x] **[Implement]** Skip the editor's first focus while the add field holds it on wide screens.
- [x] **[Implement]** Make the add bar always refocus its field and drop the false return.
- [x] **[Verify]**    Run unit, e2e, lint, and service worker checks until green.
- [x] **[Visual]**    Capture before and after screenshots of focus after an add.
- [x] **[Doc]**       Update ui-design.md and CHANGELOG.md.

## Execution Log
- [2026-11-09] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-09] **[Verify]**
  Red phase: new unit and e2e focus tests fail before the fix, as expected.
  - Unit: 4 failed, 82 passed.
  - E2e: 7 failed, 26 passed; compact test already green.

- [2026-11-10] **[Implement]**
  Editor skips its first focus while the add field holds it on wide screens; the add bar always refocuses its field.
  - Size note: 12 counted files; one focus rule spans editor, add bar, screens.

- [2026-11-10] **[Verify]**
  Unit, e2e, lint, and service worker checks pass; screenshots confirm focus in light and dark.
  - Unit: 1220 passed.
  - E2e: 192 passed; 2 gallery timeouts pass alone.
  - Files touched: 12.

- [2026-11-10] **[Verify]**
  Recorded task outcomes.
  - Files touched: 12.
  - Lines touched: 170.
  - Reopenings: 0.

- [2026-11-10] **[Implement]**
  Authored unit tests for editor first focus, add bar refocus, and both screens, plus wide and compact e2e scenarios.

- [2026-11-10] **[Visual]**
  Captured before and after screenshots at 1440 px light and dark and 390 px light; see validation-proof.md.

- [2026-11-10] **[Doc]**
  Updated the Add Bar section of ui-design.md and CHANGELOG.md; committed as 20a80b1 with only this task's hunks.

- [2026-11-10] **[Complete]**
  Task completed successfully.

