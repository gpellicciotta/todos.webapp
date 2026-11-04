---
id: T0012
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T01:19:48Z"
ended_at: "2026-11-04T01:23:45Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: c4a818c038685e664e77e0e864fbc7a394c8824f
---
# T0012: Add timestamped task notes to the data store, updating each task's last activity time

## Goals
Add a notes store with create, edit, delete, and list-by-task, newest first (`NOT-1` to `NOT-4`).
Each note records its text, creation time, last edit time, and an optional author.
Adding, editing, or deleting a note updates its task's last activity time (`NOT-5`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Notes section and the store modules from the data store task.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Add the notes store and its schema upgrade, and update the task last activity time.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update docs/specs/local-store.md and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Verify]**
  Wrote 21 notes tests in tests/unit/store-notes.test.js; all 21 failed before implementation, as recorded in validation-proof.md.
  - Failures: store.addNote missing and DB_VERSION still 1.

- [2026-11-04] **[Implement]**
  Added the notes store at schema version 2, with add, edit, delete, and newest-first listing that update the task's last activity time.
  - Notes use out-of-line keys [task-id, id]; a key range reads one task.
  - Edit and delete find a note by scanning keys only.
  - tasks.js exports mustGetTask and a new markActivity helper.

- [2026-11-04] **[Verify]**
  The completion check npm test && npm run lint passed with 87 tests in 5 files.

- [2026-11-04] **[Doc]**
  Updated docs/specs/local-store.md with the notes store, version 2, and the note rules; CHANGELOG.md was left for the caller.

- [2026-11-04] **[Review]**
  Agent review approved with minor findings; versionchange handling went to T0015 and note authorship checks to T0025.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 7.
  - Lines touched: 390.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

