---
id: T0315
owner: "@claude"
session: claude-20261128-b119fc
needs: []
branch: task/T0315-place-local-events-by-start-time-expire-tasks
worktree: .plan/work/T0315-place-local-events-by-start-time-expire-tasks
status: active
started_at: "2026-11-28T03:03:07Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 745.8, input: 140, output: 54687, cache_read: 10261613, cache_write: 187014}
review_status: pending
review_round: 1
review_requested_at: "2026-11-28T03:15:41Z"
---
# T0315: Place local events by start time, expire tasks by goal, and filter failed and upcoming tasks

## Goals
Apply the ADR-0006 window rules in the local store, per docs/specs/local-store.md.
Place events by `start-time`, apply the expiry and closing rules by goal, and carry readings.
Filter on `failed`, compute the `upcoming` flag, and cover `failed` in the finished-today filter.
Persist the Show upcoming view option (`TV-14`, `TV-15`).
Rules, files, and tests: [technical-spec.md](T0315-place-local-events-by-start-time-expire-tasks/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read Lifecycle, Overdue Handling, and Queries in local-store.md and the core modules.
- [x] **[Implement]** Author failing tests for start times, expiry per goal, filters, and the view option.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Add the rules, the filters, and the preference.
- [x] **[Verify]**    Run `npm test` and lint and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.

- [2026-11-28] **[Implement]**
  Added start-time placement, expiry by goal, failed and upcoming filters, and the stored Show upcoming option. Tests came after the code; failure was shown by reverting src.
  - Decided: cancel counts as fail until T0304 and T0305 carry fail.
  - Decimal goal-target edits wait for T0316; the option sits in the view state.
  - Bumped the service worker VERSION to 2026-11-28.7.

- [2026-11-28] **[Read]**
  Read the local-store spec, overdue.js, occurrences.js, tasks.js, and query.js.

- [2026-11-28] **[Verify]**
  New tests failed on the old source: 29 failed of 152.

- [2026-11-28] **[Verify]**
  npm test passed 1963 tests; lint and check:sw are clean.

- [2026-11-28] **[Doc]**
  Updated local-store.md, CHANGELOG.md, and the service worker hashes.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

