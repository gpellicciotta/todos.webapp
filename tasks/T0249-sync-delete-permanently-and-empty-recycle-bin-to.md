---
id: T0249
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
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
- [ ] **[Read]**      Read the T0257 purge routes, push.js, the bin store, and the sync queue spec.
- [ ] **[Doc]**       Update BIN-4, BIN-7, the Recycle Bin design, and the local store and sync queue specs.
- [ ] **[Implement]** Author failing unit tests for queued purges, their push, the 409 recovery, and unsent rows.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the purge entries, their push, and the 409 recovery.
- [ ] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md after the user rejected device-only permanent deletes.
