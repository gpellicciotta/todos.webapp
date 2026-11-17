---
id: T0275
owner: "@claude"
session: claude-20261117-882fc5
needs: []
branch: task/T0275-make-the-e2e-suite-stable-under-full-parallel
worktree: .plan/work/T0275-make-the-e2e-suite-stable-under-full-parallel
status: active
started_at: "2026-11-17T20:14:43Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 5, duration_s: 4101.6, input: 46, output: 9134, cache_read: 2535058, cache_write: 17675}
work_duration: 3781.2
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T21:25:03Z"
---
# T0275: Make the e2e suite stable under full parallel load: all-tasks.spec.js:591 and sidebar-find.spec.js:43 each failed once

## Goals
Make `npm run test:e2e` pass reliably under full parallel load on a developer machine.
T0267 saw single failures in `all-tasks.spec.js:591` (the `task-row--added` class was gone) and `sidebar-find.spec.js:43`.
Each passed five times in a row alone, and the next full run passed.
Find the timing assumption each test makes, and make the wait deterministic.
Completion check: three consecutive `python scripts/devops.py check` runs pass.
Size estimate: 2 files, 40 lines.
Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Tests
- Unit: none (only browser timing shows the defect).
- Integration: both specs with `--repeat-each 10`, then three full e2e runs.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0275.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Implement]**
  Paused the clock and awaited each add in the just added row test; awaited the find count in sidebar-find.
  - Stress 80/80 passed; before, 5 of 80 failed.

- [2026-11-17] **[Decided]**
  Bumped the service worker VERSION, since T0278 left check failing on main; fixed serve.test.js and sharing.spec.js flakes found in full runs.
  - Undeclared files: service-worker.js, serve.test.js, sharing.spec.js.

- [2026-11-17] **[Decided]**
  Left pwa.spec.js unchanged: one ready timeout had all requests succeed, and other tests in that run stalled too.
  - Not reproduced in 80 stressed runs.

- [2026-11-17] **[Verify]**
  Three consecutive devops check runs passed on f374c06; verbatim output in validation-proof.md.
  - 1755 unit, 272 e2e, 189 pytest each run.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 5.
  - Lines touched: 20.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

