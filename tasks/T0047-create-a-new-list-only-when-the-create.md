---
id: T0047
owner: "@codex"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-06T19:31:47Z"
ended_at: "2026-11-06T19:39:48Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@review_t0047"
completion-commit: 7e165468b40b7205b6ddad49331f65403aec2c1e
---
# T0047: Create a new list only when the Create button is clicked, not when the dialog is closed

## Goals
Create a new list only when the user clicks Create.
Closing the new-list editor with the x button or Escape creates nothing.
Editing an existing list still saves on change.
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

## Task Execution Steps
- [x] **[Read]**      Read list-editor.js and editor-panel.js to see where creation fires today.
- [x] **[Implement]** Author tests: closing a new list creates nothing; Create saves it; duplicates block Create.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Show a Create button in new mode, disabled until the name is valid, and stop auto-creation.
- [x] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-06] **[Implement]**
  Started node scripts/serve.mjs --port 8756 for visual verification; process identifier recorded in server.log.

- [2026-11-06] **[Implement]**
  Preview command: node scripts/serve.mjs --port 8756; PID 14532. Output: server.log; errors: server-error.log.

- [2026-11-06] **[Decided]**
  Added read-only validation in the store facade and release metadata. Size note: nine files keep one creation flow with shared validation and required documentation.

- [2026-11-06] **[Verify]**
  Passed 751 unit tests, 28 browser tests, changed-file ESLint, cache consistency, and 30 cache tests. Evidence and screenshots appear in validation-proof.md.

- [2026-11-06] **[Review]**
  Independent reviewer found two submission races. Both were fixed with regression coverage; re-review approved the revision and independently passed 14 editor tests.

- [2026-11-06] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-06] **[Review]**
  Round 1 approved by @review_t0047.

- [2026-11-06] **[Review]**
  Round 2 approved by @review_t0047.

- [2026-11-06] **[Verify]**
  Recorded final outcomes, including release and shared validation files. Size note: ten counted files remain one creation-flow concern.
  - Files touched: 10.
  - Lines touched: 247.
  - Reopenings: 0.

- [2026-11-06] **[Complete]**
  Task completed successfully.

