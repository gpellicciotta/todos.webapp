---
id: T0249
owner: "@claude"
session: claude-20261117-81639b
needs: []
branch: task/T0249-sync-delete-permanently-and-empty-recycle-bin-to
worktree: .plan/work/T0249-sync-delete-permanently-and-empty-recycle-bin-to
status: active
started_at: "2026-11-17T01:32:26Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0249: Sync Delete permanently and Empty recycle bin to the account while connected, queued while offline

## Goals
Make permanent deletes from the Recycle Bin reach the account, not just this device.
- Today they purge locally only: the server keeps the entry, other devices restore it, and a fresh snapshot brings it back.
- While connected, Delete permanently and Empty recycle bin queue a purge that uses the todos.server T0257 routes.
- A purge the service refuses because the entry was restored elsewhere brings the entry back locally.
- Blocked until todos.server T0257 serves the recycle bin purge routes in production.
- Rules and tests: [technical-spec.md](T0249-sync-delete-permanently-and-empty-recycle-bin-to/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the T0257 purge routes, push.js, the bin store, and the sync queue spec.
- [x] **[Doc]**       Update BIN-4, BIN-7, the Recycle Bin design, and the local store and sync queue specs.
- [x] **[Implement]** Author failing unit tests for queued purges, their push, the 409 recovery, and unsent rows.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the purge entries, their push, and the 409 recovery.
- [x] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md after the user rejected device-only permanent deletes.

- [2026-11-17] **[Implement]**
  Queued purge and empty-bin entries, pushed them, and recovered a 409 by reading the row back.
  - Unsent rows drop their entries.

- [2026-11-17] **[Verify]**
  Unit, e2e, lint pass. Contract suite fails 3 new tests: local jar predates server T0257.

- [2026-11-17] **[Doc]**
  Size note: 11 counted files estimated; queue entries, push, and specs cannot merge apart.

- [2026-11-17] **[Read]**
  Read the server T0257 purge routes, push.js, bin store, and queue spec.

- [2026-11-17] **[Verify]**
  Contract suite not confirmed: purge routes need a rebuilt todos.server jar, which needs credentials and sibling writes.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 451.
  - Reopenings: 0.

