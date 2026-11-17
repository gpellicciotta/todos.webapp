---
id: T0243
owner: "@claude"
needs: []
branch: task/T0243-fix-first-connect-upload-losing-lists-whose-ids
worktree: .plan/work/T0243-fix-first-connect-upload-losing-lists-whose-ids
status: active
started_at: "2026-11-17T03:08:31Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Implement]** Implement required changes for T0243.
- [ ] **[Verify]**    Verify implementation with automated test suites.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.
