---
id: T0243
owner: "@claude"
session: claude-20261117-86a0e4
needs: []
branch: task/T0243-fix-first-connect-upload-losing-lists-whose-ids
worktree: .plan/work/T0243-fix-first-connect-upload-losing-lists-whose-ids
status: completed
started_at: "2026-11-17T03:08:31Z"
ended_at: "2026-11-17T03:12:36Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 166.1, input: 48, output: 12478, cache_read: 2145314, cache_write: 86864}
  review: {turns: 1, duration_s: 67.5, input: 44441, output: 1529, cache_read: 364672, cache_write: 0}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T03:11:26Z"
reviewed_by: "@codex"
review_session: codex-20261117-db2611
work_duration: 245.4
completion-commit: 758842d67b6787035585926f4220b4730d012d65
---
# T0243: Fix first-connect upload losing lists whose IDs match trashed server lists, and make restore re-send memberships

## Goals
Incident 2026-11-15: an imported backup restored lists whose IDs were trashed on the server. Adoption matched them by ID and skipped them.
The server refused the list updates (`409`) and 1657 membership uploads (`404`); the first pull then replaced the local lists with the trashed rows.
Restoring from the recycle bin left memberships unsent, so moves failed with `400`.
- Adoption must keep a live local list that matches a trashed account list: restore or rename it.
- Restoring a list must queue the memberships the server lacks.

Completion check: `npm test`

### Declared Files
- src/js/sync/adopt.js
- src/js/sync/merge.js
- src/js/store/bin.js
- tests/unit/adopt.test.js
- tests/unit/merge.test.js
- tests/unit/bin.test.js

Size estimate: 6 files, 200 lines

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0243.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Implement]**
  Adoption restores trashed account lists matching live local ids; restores queue memberships. Touched undeclared queue.js and queue.test.js.

- [2026-11-17] **[Verify]**
  Red run failed 4 tests; npm test then passed 1579 tests, recorded in validation-proof.md.

- [2026-11-17] **[Doc]**
  Added two Sync bullets under v0.5.1-pre in CHANGELOG.md.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @codex: Approved.
  - Findings: [review-findings-1.md](T0243-fix-first-connect-upload-losing-lists-whose-ids/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

