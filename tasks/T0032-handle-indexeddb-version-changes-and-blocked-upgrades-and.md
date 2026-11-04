---
id: T0032
owner: "@claude-code"
needs: [T0014]
branch: —
worktree: —
status: completed
started_at: "2026-11-04T16:19:09Z"
ended_at: "2026-11-04T16:24:35Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 1a44b10a0795da282f1c3310ff75fb9992931f52
---
# T0032: Handle IndexedDB version changes and blocked upgrades, and add change subscriptions to the store facade

## Goals
Close the store's connection on `versionchange`, and turn a `blocked` upgrade into a `StoreError` (`T0012` follow-up).
Add `subscribe()` and an opt-in cross-tab broadcast to the store facade, so views update when data changes.
Split from T0015 on 2026-11-04 for size; the code was written during T0015.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the parked code written during T0015 and the review follow-ups it covers.
- [x] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [x] **[Verify]**    Run the tests without the implementation, confirm they fail, and record the output.
- [x] **[Implement]** Take over the implementation from the T0015 working tree.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Implement]**
  Took over the db.js connection handling and subscriptions written during T0015, with local-store.md sections.
  - Files touched: 3.
  - Lines touched: 187, under the 200-line estimate.
  - Red against HEAD; green at stage 1.

- [2026-11-04] **[Review]**
  Agent review of the split stages approved this task; minor findings were recorded as T0016 follow-ups.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 4.
  - Lines touched: 188.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

