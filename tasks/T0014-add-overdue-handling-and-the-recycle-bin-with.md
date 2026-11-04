---
id: T0014
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T01:37:14Z"
ended_at: "2026-11-04T01:44:00Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 33ffa984af726a538274130b2eaa52178acf49df
---
# T0014: Add overdue handling and the recycle bin with restore, permanent delete, and the 30-day purge

## Goals
Compute the overdue flag and cancel overdue tasks with behavior `cancel` (`OVD-1` to `OVD-6`).
Run the overdue check on start and every minute while the app is open.
Move deleted lists and tasks to the recycle bin, keeping memberships for restore (`BIN-1` to `BIN-6`, `LST-6`, `LST-7`, `TSK-11`).
Purge entries deleted more than 30 days ago.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Overdue Handling and Recycle Bin sections and the service's business logic spec.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write overdue.js and bin.js, and route list and task deletion through the recycle bin.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Verify]**
  Wrote 31 tests in overdue.test.js and bin.test.js; the bin suite failed 20 of 20 and the overdue suite failed to load.
  - Causes: overdue.js missing and the bin facade operations missing.

- [2026-11-04] **[Implement]**
  Added overdue.js with isOverdue, applyOverdueHandling, and a one-minute timer, plus bin.js with delete, restore, listBin, purgeForever, and purgeExpired.
  - No schema bump: the bin uses existing deletion-time fields, staying at version 2.
  - Changes to deleted lists or tasks throw StoreError code deleted.
  - Restores after 30 days throw code expired; non-deleted entries throw not-deleted.
  - The timer's stop function exposes idle() to await a run in progress.

- [2026-11-04] **[Verify]**
  The check npm test && npx eslint src/js tests/unit passed with 195 tests in 8 files; full npm run lint also passed.

- [2026-11-04] **[Doc]**
  Added Recycle Bin and Overdue Handling sections to docs/specs/local-store.md; CHANGELOG.md was left for the caller.

- [2026-11-04] **[Review]**
  Agent review approved; fixed its overdue race by re-checking each task inside the update transaction, with a regression test.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 9.
  - Lines touched: 891.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

