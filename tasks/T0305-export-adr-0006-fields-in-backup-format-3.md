---
id: T0305
owner: "@claude"
session: claude-20261128-4879fa
needs: []
branch: task/T0305-export-adr-0006-fields-in-backup-format-3
worktree: .plan/work/T0305-export-adr-0006-fields-in-backup-format-3
status: active
started_at: "2026-11-28T05:39:01Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 1562.7, input: 252, output: 117252, cache_read: 27014822, cache_write: 309643}
  review: {turns: 3, duration_s: 200.9, input: 74262, output: 5297, cache_read: 830208, cache_write: 0}
review_status: rejected
review_round: 3
review_requested_at: "2026-11-28T06:37:09Z"
review_session: codex-20261128-21ef1a
work_duration: 1763.6
reviewed_by: "@codex"
---
# T0305: Export ADR-0006 fields in backup format 3, and convert older backups on import

## Goals
Write backup format 3 with the ADR-0006 fields of todos.server, per backup-format.md after T0299.
Read formats 1, 2, and 3; convert `complete` and `uncomplete` in older files as the specs say.
Keep merge imports per row, as `BAK-6` requires.
The user decided on 2026-11-28: import rebuilds at most 10,000 missing checks per occurrence.
A larger gap adds no check; import everything else, and the import dialog names each affected task and its missing count.

## Task Execution Steps
- [x] **[Read]**      Read backup-format.md and backup.js.
- [x] **[Implement]** Author failing backup tests for format 3 and the conversion of formats 1 and 2.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Write format 3 and convert older formats on import.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Implement]**
  Wrote format 3 export, format 2 conversion, and log-form format 1 status events in backup.js.
  - Replay helpers in occurrences.js take a fields option.
  - service-worker.js VERSION bumped, hashes updated.

- [2026-11-28] **[Doc]**
  Size note: 7 counted files, about 965 lines, above the typical line; tests are 410 of them and the conversion needed new code beyond the 250-line estimate.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 7.
  - Lines touched: 965.
  - Reopenings: 0.

- [2026-11-28] **[Read]**
  Read backup-format.md, backup.js, occurrences.js, and the store upgrade; found the store still uses target-count and cancel locally.

- [2026-11-28] **[Verify]**
  New format 3, format 2, and format 1 tests failed first for the right reasons.
  - 6 of 123 failed before the code.

- [2026-11-28] **[Verify]**
  Backup unit, whole unit, lint, backup end-to-end, and precache checks pass.
  - 128 backup tests, 2112 unit tests, 12 end-to-end tests.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: Format 3 and legacy conversion tests pass, but a valid backup can make import effectively hang.
  - Findings: [review-findings-1.md](T0305-export-adr-0006-fields-in-backup-format-3/review-findings-1.md).

- [2026-11-28] **[Implement]**
  Review round 1: capped missing checked logs at 32767, so a huge valid progress adds none and import finishes.
  - Regression test, docs, changelog, and SW version updated.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 2 rejected by @codex: The limit prevents the extreme loop, but silently loses valid backup progress.
  - Findings: [review-findings-2.md](T0305-export-adr-0006-fields-in-backup-format-3/review-findings-2.md).

- [2026-11-28] **[Decide]**
  Needs review: a checks goal counts one checked log per check, so a gap above 32767 cannot be kept without a new format field or cache-only override.
  - A: add a count field to checked logs (format and service change).
  - B: override the cache only, which a later refold drops.
  - C: keep the cap and report the lost progress.

- [2026-11-28] **[Decided]**
  Loop manager chose option C: keep the 32,767 limit that formats 1 and 2 already apply, and report every task whose progress import could not rebuild.
  - Show the affected tasks in the import result; never drop silently.
  - State the limit in backup-format.md and test the report.

- [2026-11-28] **[Implement]**
  Round 2: kept the 32767 cap, reported unrebuilt progress in the import result, and made check rebuild linear.
  - Tests cover 32767, 32768, and a huge gap.

- [2026-11-28] **[Review]**
  Round 3 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 3 rejected by @codex: The revised import reports missing progress to its caller, but users still receive no warning and valid progress remains lost.
  - Findings: [review-findings-3.md](T0305-export-adr-0006-fields-in-backup-format-3/review-findings-3.md).

- [2026-11-28] **[Suspended]**
  Suspended after 3 consecutive review rejections (blocking: 1, 1, 2). Inspect review findings before lifecycle resume.

- [2026-11-28] **[Decided]**
  The user decided on 2026-11-28: "A for T0305 and let's limit to 10,000 if you've used that limit elsewhere"; the server CSV import already uses 10,000.
  - Option A: import the rest; the dialog names affected tasks and missing counts.
  - Rebuild at most 10,000 checks per occurrence, for format 2 and 3 imports.
  - State this in backup-format.md and cover the dialog report end to end.

- [2026-11-28] **[Implement]**
  Round 3: applied the user's 10,000 cap to formats 2 and 3, and named affected tasks in the import dialog.
  - Unit, dialog, and end-to-end tests cover the report.

