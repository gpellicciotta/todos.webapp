---
id: T0032
owner: ~
needs: [T0014]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0032: Handle IndexedDB version changes and blocked upgrades, and add change subscriptions to the store facade

## Goals
Close the store's connection on `versionchange`, and turn a `blocked` upgrade into a `StoreError` (`T0012` follow-up).
Add `subscribe()` and an opt-in cross-tab broadcast to the store facade, so views update when data changes.
Split from T0015 on 2026-11-04 for size; the code was written during T0015.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the parked code written during T0015 and the review follow-ups it covers.
- [ ] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests without the implementation, confirm they fail, and record the output.
- [ ] **[Implement]** Take over the implementation from the T0015 working tree.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
