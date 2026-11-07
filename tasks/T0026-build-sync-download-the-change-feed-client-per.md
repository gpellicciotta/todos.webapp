---
id: T0026
owner: "@claude"
session: claude-20261107-ceb05a
needs: []
branch: task/T0026-build-sync-download-the-change-feed-client-per
worktree: .plan/work/T0026-build-sync-download-the-change-feed-client-per
status: active
started_at: "2026-11-07T19:48:39Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1597.6, input: 264, output: 181808, cache_read: 20761968, cache_write: 406400}
review_status: pending
review_round: 1
---
# T0026: Build sync download: the change feed client, per-field merge, lost access handling, and the sync log store

## Goals
Pull remote changes through the service's change feed and apply them without a reload (`SYN-3`, `CON-6`).
Merge concurrent edits per field, keeping the most recent edit of each field (`SYN-5`, `SYN-6`).
Record overwritten values, rejected changes, lost access, and errors in a 30-day sync log store (`SYN-8`).
Remove lists and tasks the user lost access to (`SHR-8`), and handle disconnect data rules (`CON-8`, `CON-9`).
Run the sync engine: polling, expired cursors, and an unknown protocol (`SYN-3`, `SYN-11`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Sync section and the todos change feed spec from todos task T0138.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the change feed client, the per-field merge, and the sync log store.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Implement]**
  Added merge, pull, sync log, and engine; wired the engine into app.js with a fake change feed in tests.
  - Replay conflicts now apply the kept value.
  - Existence conflicts are logged only.

- [2026-11-07] **[Decided]**
  Size note: 18 files, 1894 lines, above the large line but under three times the 750-line estimate; tests are about half.

- [2026-11-07] **[Verify]**
  Unit, lint, check:sw, and e2e checks pass; undeclared files touched: queue, push, app, index, service worker, specs.
  - Files touched: 18.
  - Lines touched: 1894.
  - Reopenings: 0.

- [2026-11-07] **[Read]**
  Read the sync requirements and the todos change feed, tombstone, and merge rules.

- [2026-11-07] **[Doc]**
  Updated CHANGELOG.md and the local store spec with the download rules and log kinds.

- [2026-11-07] **[Verify]**
  Red run failed on missing modules; green run passed 1014 unit tests, lint, check:sw, and 30 e2e tests.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

