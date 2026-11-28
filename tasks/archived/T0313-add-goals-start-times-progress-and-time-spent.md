---
id: T0313
owner: "@claude"
session: claude-20261128-c1da60
needs: []
branch: task/T0313-add-goals-start-times-progress-and-time-spent
worktree: .plan/work/T0313-add-goals-start-times-progress-and-time-spent
status: completed
started_at: "2026-11-28T01:07:55Z"
ended_at: "2026-11-28T01:27:10Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 988.1, input: 144, output: 51290, cache_read: 10357218, cache_write: 185290}
  review: {turns: 3, duration_s: 122.3, input: 50395, output: 2816, cache_read: 529920, cache_write: 0}
review_status: approved
review_round: 2
review_requested_at: "2026-11-28T01:26:07Z"
work_duration: 1154.9
review_session: codex-20261128-107c4d
reviewed_by: "@codex"
completion-commit: aa3f6b824ad6c335fa2343a12a9d014685b54364
---
# T0313: Add goals, start times, progress, and time spent to local records in database version 6

## Goals
Add the ADR-0006 record fields in IndexedDB version 6, per Store Upgrade in docs/specs/local-store.md.
Rules and occurrences gain the goal fields, `start-time`, `progress`, and `time-spent-seconds`.
Keep behavior unchanged: events stay `complete` and `uncomplete`, and no status changes.
Keep `target-count` and `completion-count` as mirrors of `goal-target` and `progress`, so no reader changes.
T0314 converts events, T0315 adds start times and expiry, and T0316 removes the mirrors.
Rules, files, and tests: [technical-spec.md](T0313-add-goals-start-times-progress-and-time-spent/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read Goals and Store Upgrade in local-store.md, occurrences.js, db.js, and migrate.js.
- [x] **[Implement]** Author failing tests for the upgrade of rules and occurrences and for the mirrors.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Add the fields, the upgrade step, and the mirror upkeep.
- [x] **[Verify]**    Run `npm test` and lint and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.

- [2026-11-28] **[Implement]**
  Decided: mirrors flow from target-count and completion-count; goal fields stay out of sync payloads and backups.
  - Upgrade runs only from version 5.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 16.
  - Lines touched: 330.
  - Reopenings: 0.

- [2026-11-28] **[Read]**
  Read the goals and store upgrade specs, occurrences.js, db.js, and migrate.js.

- [2026-11-28] **[Implement]**
  Authored failing tests for goal fields, mirrors, and the version 5 upgrade.

- [2026-11-28] **[Verify]**
  Confirmed eight new tests failed for missing fields and version 6.

- [2026-11-28] **[Verify]**
  Full suite of 1866 tests and lint passed; proof is in validation-proof.md.

- [2026-11-28] **[Doc]**
  Size note: 17 counted files, 351 changed lines, since existing exact-shape tests needed the new fields; the earlier outcome counts were estimates.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: The migration and mirror tests pass, as do the full automated suite and lint.
  - Findings: [review-findings-1.md](T0313-add-goals-start-times-progress-and-time-spent/review-findings-1.md).

- [2026-11-28] **[Implement]**
  Added the end-to-end version 5 upgrade spec the review asked for; it passes with all 288 e2e tests.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 2 approved by @codex: The required browser migration scenario passes and preserves the displayed counts.
  - Findings: [review-findings-2.md](T0313-add-goals-start-times-progress-and-time-spent/review-findings-2.md).

- [2026-11-28] **[Complete]**
  Task completed successfully.

