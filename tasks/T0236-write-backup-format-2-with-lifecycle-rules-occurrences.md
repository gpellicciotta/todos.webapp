---
id: T0236
owner: "@claude"
session: claude-20261115-81474f
needs: []
branch: task/T0236-write-backup-format-2-with-lifecycle-rules-occurrences
worktree: .plan/work/T0236-write-backup-format-2-with-lifecycle-rules-occurrences
status: active
started_at: "2026-11-15T14:13:06Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 5283.4, input: 652, output: 367618, cache_read: 83889846, cache_write: 761856}
  review: {turns: 2, duration_s: 1660.0, input: 882562, output: 103670, cache_read: 16594072}
review_status: rejected
review_round: 1
review_requested_at: "2026-11-15T12:16:43Z"
reviewed_by: "@gemini"
review_session: antigravity-20261115-1916b3
work_duration: 3510.0
size_status: approved
size_estimate: 12 files, 1695 lines
size_approved: 12 files, 1695 lines
size_approved_by: "@giova"
size_approved_at: "2026-11-15T14:04:03Z"
---
# T0236: Write backup format 2 with lifecycle rules, occurrences, and events, keeping format 1 importable

## Goals
Raise the backup format to version 2 with top-level `lifecycle-rules`, `occurrences`, and `events` arrays.
Treat `occurrences` as export-only: import rebuilds occurrences from rules and events.
Keep format 1 importable through the mapping T0224 added.
Add imported events by identifier in merge mode (`BAK-6`), posting them with `import: true` while connected.
Start after T0224 and todos.server T0241; follow the [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the T0215 export rules, backup-format.md, backup.js, and the T0224 format 1 mapping.
- [x] **[Implement]** Author unit tests that export format 2 and import formats 1 and 2 in both modes.
- [x] **[Implement]** Author an e2e test that exports and reimports a target-3 task with completions.
- [x] **[Verify]**    Run the unit and e2e suites and capture the expected red-phase failures.
- [x] **[Implement]** Write format 2 and import it, rebuilding occurrences and replaying events with import true.
- [x] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [x] **[Doc]**       Update backup-format.md, the backup requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Wrote the backup format 2 part of the approved T0224 split.

- [2026-11-15] **[Read]**
  Read the T0215 JSON format rules, server import routes, backup.js, the format 1 mapping, bulk.js, and importEntries in queue.js.

- [2026-11-15] **[Verify]**
  Red phase: 37 of 87 backup unit tests and 2 of 11 backup e2e tests failed as expected, on format version 1 output and refused version 2 files.

- [2026-11-15] **[Implement]**
  Wrote format 2 export and validation, replayed rules and events into rebuilt occurrences, and queued import-true replays while connected.
  - Decided: add user events when backup events miss the exported status.
  - Decided: rules and events count with their task.

- [2026-11-15] **[Implement]**
  Touched undeclared files the format needed: occurrences.js, bulk.js, queue.js, service-worker.js, the contract test, and local-store.md.
  - import-dialog.js needed no change.
  - Mechanical: node scripts/check-sw-version.mjs --update.

- [2026-11-15] **[Verify]**
  Unit, lint, service worker, contract, and e2e suites passed; the contract suite ran on a fresh todos.server build in work/todos-server.
  - npm test: 1431 passed.
  - contract: 11 passed.
  - e2e: 210 passed.

- [2026-11-15] **[Doc]**
  Updated backup-format.md, requirements BAK-2, BAK-3, and BAK-6, local-store.md, and CHANGELOG.md.

- [2026-11-15] **[Verify]**
  Size note: 11 counted files and 1314 changed lines cross the large line; export, import, replay, and their tests form one format change.
  - Tests account for 467 lines.
  - Human size approval needed before integration.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 1314.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-15] **[Review]**
  Round 1 rejected by @gemini: Format 2 export, format 1 compatibility, ESLint, SW check, 1,431 unit tests, backup e2e, and 11 contract tests pass.
  - Findings: [review-findings-1.md](T0236-write-backup-format-2-with-lifecycle-rules-occurrences/review-findings-1.md).

- [2026-11-15] **[Size]**
  Size note: 12 files, 1324 lines, above the large line; round 1 rework adds more. Manager: keep whole, since format 2 export and import cannot merge apart; human approval needed.

- [2026-11-15] **[Implement]**
  Reworked review round 1: replays settle on the exported rules, overwrite rebuilds tasks with differing events, rule edit values are validated, ended series close with end-recurrence.
  - Deterministic UUIDv7 identifiers keep repeated imports unchanged.
  - Settling edit comes 1 ms after the last rule edit.

- [2026-11-15] **[Verify]**
  Fifteen new unit tests and two new contract tests failed on the round 1 code; all suites pass at 0e87bc9.
  - npm test: 1447 passed.
  - contract: 13 passed.
  - e2e: 210 passed.

- [2026-11-15] **[Doc]**
  Documented the settling rule edit, deterministic identifiers, ended series, overwrite rebuilds, and rule value checks in backup-format.md and CHANGELOG.md.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 1685.
  - Reopenings: 0.

- [2026-11-15] **[Size]**
  Size approval requested for 12 files, 1695 lines.

- [2026-11-15] **[Size]**
  Size approved by @giova for 12 files, 1695 lines.

- [2026-11-15] **[Implement]**
  Manager merged main after T0237 landed, resolving CHANGELOG and precache manifest conflicts; VERSION is now 2026-11-15.16.
  - Lint, sw check, 1472 unit, 211 e2e, 15 contract tests pass.

