---
id: T0025
owner: "@claude"
session: claude-20261107-124fd3
needs: []
branch: task/T0025-build-sync-upload-the-change-queue-first-connect
worktree: .plan/work/T0025-build-sync-upload-the-change-queue-first-connect
status: active
started_at: "2026-11-07T19:27:18Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 1730.4, input: 272, output: 179418, cache_read: 21026968, cache_write: 419998}
  review: {turns: 2, duration_s: 536.4, input: 317740, output: 34426, cache_read: 2467314}
review_status: pending
review_round: 2
work_duration: 1070.8
---
# T0025: Build sync upload: the change queue, first-connect adoption of local data, and rollback of rejected changes

## Goals
Queue every local change while connected and upload it in order, without duplicates on retry (`SYN-1`, `SYN-2`, `SYN-10`).
On first connect, upload all local data and merge local lists into same-named account lists (`CON-4`, `CON-5`).
Undo a change the service rejects and record it for the sync log (`SYN-9`).
Send only changed fields in updates, so per-field merge works (`SYN-5`), and sync from one tab only (`SYN-12`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Sync section and the todos sync protocol spec from todos task T0136.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the API client, the change queue, upload, and first-connect adoption.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Implement]**
  Added queue, API client, push engine, adoption, and version 4 stores; wired push in app.js.
  - Undeclared files: idb.js, bulk.js, app.js, index.html, service-worker.js.
  - Also updated e2e specs for connected mode.

- [2026-11-07] **[Decided]**
  Queue entries join the queue after the write commits; a crash between the two loses that entry.
  - Entries carry undo data for rollback.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 22.
  - Lines touched: about 1900.
  - Reopenings: 0.

- [2026-11-07] **[Decided]**
  Size note: above the typical line; one ordering and retry contract spans queue, upload, and adoption.

- [2026-11-07] **[Read]**
  Read the todos REST API and business logic specs on sync, merging, and adoption.

- [2026-11-07] **[Doc]**
  Updated CHANGELOG.md and docs/specs/local-store.md.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 rejected by @gemini: The change queue, API client, upload engine, rollback logic, tab leadership, and version 4 store migration are well-designed and pass.
  - Findings: [review-findings-1.md](T0025-build-sync-upload-the-change-queue-first-connect/review-findings-1.md).

- [2026-11-07] **[Implement]**
  Review round 1: sorted adoption memberships by list and position, added a test, fixed table alignment, trimmed sentences.
  - Bumped service worker VERSION for adopt.js.

- [2026-11-07] **[Review]**
  Round 2 requested (mode: agent).

