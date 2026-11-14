---
id: T0213
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-08T13:11:54Z"
ended_at: "2026-11-08T13:22:01Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-subagent"
completion-commit: dac760bea924fb9e219e2621b29f6919faada640
---
# T0213: Add a Delete all data action with typed confirmation to the Data section of Settings

## Goals
Add a Delete all data action to the Data section of Settings. It permanently erases every list, task, note, membership, and recycle bin entry on this device.
The user must type DELETE to confirm, after an offer to export a backup first.
The action is unavailable while connected, as Overwrite import is; the user disconnects first.
Theme and server settings stay.
Completion check: `npm test`
Size estimate: 9 files, 250 lines
Size note: Store, Settings, tests, and four documents; a split piece could not merge alone.
See the companion technical specification.

## Task Execution Steps
- [x] **[Read]**      Read the Settings screen, the import dialog, the store facade, and their tests.
- [x] **[Decide]**    Confirm the connected-mode rule and what Delete all data keeps with the user.
- [x] **[Implement]** Author failing unit tests for the store function and the Settings action.
- [x] **[Verify]**    Run the new tests and record that they fail.
- [x] **[Implement]** Add deleteAllData to the store and expose it as a write in the facade.
- [x] **[Implement]** Add the Delete all data button and its typed confirmation dialog to Settings.
- [x] **[Verify]**    Run the unit tests and the lint checks until they pass.
- [x] **[Visual]**    Check the dialog in the browser, local and connected, light and dark themes.
- [x] **[Doc]**       Add the next BAK requirement, the store and screen specs, and a CHANGELOG entry.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-08] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Implement]**
  Size note: 12 files, above 8, since views.css, the e2e spec, and the version bump joined the declared files.

- [2026-11-08] **[Decided]**
  Kept the spec's connected-mode rule: Delete all data is disabled while not local; theme and server URL stay.

- [2026-11-08] **[Verify]**
  Recorded task outcomes.
  - Files touched: 12.
  - Lines touched: 350.
  - Reopenings: 0.

- [2026-11-08] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-08] **[Review]**
  Agent review rejected pending dialog-while-connected; fixed it plus count failure, double submit, focus, and wording, with tests.

- [2026-11-08] **[Review]**
  Round 1 approved by @claude-review-subagent.

- [2026-11-08] **[Review]**
  Agent re-review approved dac760b; low items left: connect during count read, focus after auto-close, export during erase.

- [2026-11-08] **[Visual]**
  Checked Settings at 390 px: [before](T0213-add-a-delete-all-data-action-with-typed/before-settings.png), [after](T0213-add-a-delete-all-data-action-with-typed/after-settings.png), [dialog](T0213-add-a-delete-all-data-action-with-typed/delete-all-dialog.png).

- [2026-11-08] **[Complete]**
  Task completed successfully.

