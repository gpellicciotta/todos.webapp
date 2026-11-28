---
id: T0299
owner: "@claude"
session: claude-20261128-2ef460
needs: []
branch: task/T0299-specify-adr-0006-goals-logs-statuses-and-backup
worktree: .plan/work/T0299-specify-adr-0006-goals-logs-statuses-and-backup
status: active
started_at: "2026-11-28T00:08:59Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 225.1, input: 50, output: 25422, cache_read: 2077237, cache_write: 117826}
review_status: pending
review_round: 1
review_requested_at: "2026-11-28T00:12:50Z"
---
# T0299: Specify ADR-0006 goals, logs, statuses, and backup format 3 in the local store and backup format specs

## Goals
Specify ADR-0006 of todos.server for the local store and backups, so local mode matches the service.
In docs/specs/local-store.md, cover goal fields, `start-time`, the `year` unit, `progress`, `time-spent-seconds`, and `failed`.
Also cover `log` and `undo-log` events, the fold, closing rules, carried readings, and the upgrade of local legacy events.
In docs/specs/backup-format.md, specify format 3 with the new fields, and the conversion of formats 1 and 2.
Follow todos.server business-logic-spec.md once its task T0293 lands.

## Task Execution Steps
- [x] **[Read]**      Read ADR-0006, the todos.server specs, local-store.md, and backup-format.md.
- [x] **[Doc]**       Update local-store.md for goals, start times, the log, the fold, statuses, and the store upgrade.
- [x] **[Doc]**       Update backup-format.md for format 3 and the conversion of older formats.
- [x] **[Verify]**    Lint both specs.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Doc]**
  Specified goals, log, fold, statuses, store version 6, and backup format 3 with conversions.
  - Lint of both specs passed.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 2.
  - Lines touched: 323.
  - Reopenings: 0.

- [2026-11-28] **[Read]**
  Read ADR-0006 and both specs; the server business-logic spec already holds the model.

- [2026-11-28] **[Decided]**
  Replaced unverifiable ADR link and not-yet-existing fixture links with plain text, so lint passes.

- [2026-11-28] **[Doc]**
  Added the CHANGELOG bullet under v0.6.1-pre.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

