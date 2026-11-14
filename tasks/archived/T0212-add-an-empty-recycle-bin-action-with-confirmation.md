---
id: T0212
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-08T13:09:03Z"
ended_at: "2026-11-08T13:22:07Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-subagent"
completion-commit: dac760bea924fb9e219e2621b29f6919faada640
---
# T0212: Add an Empty recycle bin action with confirmation to the recycle bin screen

## Goals
Add an Empty recycle bin action to the recycle bin screen. It asks first and names what it removes.
It permanently deletes every listed list and task with its memberships and notes, as Delete permanently does one by one.
It queues nothing for sync, as `purgeForever` does. Restore is not possible afterward.
Completion check: `npm test`
Size estimate: 9 files, 200 lines
Size note: Store, screen, tests, and four documents; a split piece could not merge alone.
See the companion technical specification.

## Task Execution Steps
- [x] **[Read]**      Read the recycle bin store, the recycle bin screen, and their tests.
- [x] **[Implement]** Author failing unit tests for the store function and the screen action.
- [x] **[Verify]**    Run the new tests and record that they fail.
- [x] **[Implement]** Add emptyBin to the store and expose it as a write in the facade.
- [x] **[Implement]** Add the Empty recycle bin button and its inline confirmation to the screen.
- [x] **[Verify]**    Run the unit tests and the lint checks until they pass.
- [x] **[Visual]**    Check the screen in the browser, empty and filled, at wide and compact widths.
- [x] **[Doc]**       Add requirement BIN-7, the store and screen specs, and a CHANGELOG entry.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-08] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Implement]**
  Size note: 12 files, above 8, since views.css, the e2e spec, and the version bump joined the nine declared files.

- [2026-11-08] **[Verify]**
  Recorded task outcomes.
  - Files touched: 12.
  - Lines touched: 295.
  - Reopenings: 0.

- [2026-11-08] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-08] **[Review]**
  Agent review: approve. Fixed focus after emptying, announced count, double-click guard, and stronger sync and rollback tests.

- [2026-11-08] **[Review]**
  Round 1 approved by @claude-review-subagent.

- [2026-11-08] **[Visual]**
  Checked the screen at 390 px: [before](T0212-add-an-empty-recycle-bin-action-with-confirmation/before-bin.png), [after](T0212-add-an-empty-recycle-bin-action-with-confirmation/after-bin.png), [question](T0212-add-an-empty-recycle-bin-action-with-confirmation/empty-bin-question.png).

- [2026-11-08] **[Decided]**
  Placed Empty recycle bin above the rows, not in the header, and kept it device-local while connected.

- [2026-11-08] **[Complete]**
  Task completed successfully.

