---
id: T0304
owner: "@claude"
session: claude-20261128-9a833f
needs: []
branch: task/T0304-sync-adr-0006-logs-undos-entries-and-statuses
worktree: .plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
status: active
started_at: "2026-11-28T04:34:48Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 988.5, input: 196, output: 56823, cache_read: 12422870, cache_write: 175681}
  review: {turns: 2, duration_s: 133.4, input: 82263, output: 3924, cache_read: 857856, cache_write: 0}
review_status: rejected
review_round: 2
review_requested_at: "2026-11-28T04:52:53Z"
review_session: codex-20261128-c597d2
work_duration: 1159.8
reviewed_by: "@codex"
---
# T0304: Sync ADR-0006 logs, undos, entries, and statuses with the service, keeping queued legacy events replayable

## Goals
Sync ADR-0006 data with todos.server, per its REST API spec and local-store.md.
Queue and push `log` and `undo-log` events, and read `entries`, `progress`, `time-spent-seconds`, `failed`, and the new rule fields.
Keep `complete` and `uncomplete` changes queued before the upgrade replayable, through the service aliases.
List unknown event types without failing, and revert rejected undos as other rejected changes.
Run the contract tests against a todos.server checkout with its task T0301.

## Task Execution Steps
- [x] **[Read]**      Read the sync sections of local-store.md, the todos.server REST API spec, and the sync modules.
- [x] **[Implement]** Author failing queue, push, pull, merge, and contract tests for logs, undos, and entries.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Queue, push, and pull the new events and fields, and tolerate unknown event types.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Read]**
  Read local-store.md, the REST API spec, and the sync modules; most log and undo queueing already existed.

- [2026-11-28] **[Implement]**
  Found that the service refuses target-count and returns goal-target and progress, so 16 contract tests failed.

- [2026-11-28] **[Implement]**
  Sent goal-target on the wire, read goal-target, progress, and entries on pull, and ignored unknown entry types.

- [2026-11-28] **[Doc]**
  Updated local-store.md and CHANGELOG.md. Size note: 11 counted files, about 340 lines, because wire fixes needed tests.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 340.
  - Reopenings: 0.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: [Decided]** Reject: pending log changes do not merge correctly with a pulled occurrence.
  - Findings: [review-findings-1.md](T0304-sync-adr-0006-logs-undos-entries-and-statuses/review-findings-1.md).

- [2026-11-28] **[Implement]**
  Review rework: queued logs and undos now fold with the goal fold over pulled entries, so time, amounts, and repeated undos merge correctly.

- [2026-11-28] **[Verify]**
  Reran unit and contract suites after rework.
  - Files touched: 11.
  - Lines touched: 420.
  - Reopenings: 0.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 2 rejected by @codex: [Decided]** Reject: the reworked fold can count the same log twice.
  - Findings: [review-findings-2.md](T0304-sync-adr-0006-logs-undos-entries-and-statuses/review-findings-2.md).

- [2026-11-28] **[Implement]**
  Review rework: pulled entries and queued logs are deduplicated by event id before folding, so an overlap counts once.

- [2026-11-28] **[Verify]**
  Reran unit and contract suites after rework.
  - Files touched: 11.
  - Lines touched: 430.
  - Reopenings: 0.

