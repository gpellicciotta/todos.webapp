---
id: T0316
owner: "@claude"
session: claude-20261128-db5066
needs: []
branch: task/T0316-remove-the-legacy-target-count-and-completion-count
worktree: .plan/work/T0316-remove-the-legacy-target-count-and-completion-count
status: completed
started_at: "2026-11-28T09:01:32Z"
ended_at: "2026-11-28T09:36:37Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 1599.7, input: 276, output: 97025, cache_read: 32012015, cache_write: 335987}
  review: {turns: 1, duration_s: 489.0, input: 36, output: 8586, cache_read: 1249019, cache_write: 74758}
review_status: approved
review_round: 1
review_requested_at: "2026-11-28T09:28:21Z"
reviewed_by: "@claude"
review_session: claude-20261128-d49221
work_duration: 2104.4
completion-commit: ec811295d9cab857a1e1f07a5040b32cbe94d134
---
# T0316: Remove the legacy target-count and completion-count fields once every reader uses goals and progress

## Goals
Remove the `target-count` and `completion-count` mirrors that T0313 kept.
Every reader uses the goal fields and `progress`, as docs/specs/local-store.md specifies.
Keep reading both fields where old backups and queued legacy changes require them.
Delete legacy fold functions without callers.
Rules, files, and tests: [technical-spec.md](T0316-remove-the-legacy-target-count-and-completion-count/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Search src and tests for the legacy fields and the legacy fold functions.
- [x] **[Implement]** Change the remaining readers and tests, and remove the mirrors.
- [x] **[Verify]**    Run `python scripts/devops.py check` and `npm run test:e2e` and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.

- [2026-11-28] **[Read]**
  Found the legacy fields in 38 files; no legacy fold function loses its callers, so only the mirror helpers go.

- [2026-11-28] **[Implement]**
  Rules and occurrences now hold only goal-target and progress; fullRules and fullOccurrence read the legacy names at the edges.
  - Red phase: 6 new goal-fields tests failed first.
  - Reading goals without a reading keep a null progress.
  - Service worker VERSION bumped; its manifest was stale at HEAD.

- [2026-11-28] **[Implement]**
  Size note: 38 counted files and 1067 lines cross the large line, since every test asserting the removed fields changes with them.
  - Source and docs: 13 files, 442 lines.
  - Splitting would leave readers on fields that no longer exist.

- [2026-11-28] **[Verify]**
  python scripts/devops.py check passed with exit 0, including npm run test:e2e; evidence is in validation-proof.md.
  - Vitest: 2164 passed; Playwright: 303 passed.
  - Ruff clean; pytest: 271 passed.
  - Contract tests not run: they need a sibling todos server build.

- [2026-11-28] **[Doc]**
  Updated local-store.md for records without the counts and their legacy readers, and added CHANGELOG bullets.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 38.
  - Lines touched: 1067.
  - Reopenings: 0.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 approved by @claude: Approved: the work meets every goal, and the full check passes on the reviewed commit.
  - Findings: [review-findings-1.md](T0316-remove-the-legacy-target-count-and-completion-count/review-findings-1.md).

- [2026-11-28] **[Complete]**
  Task completed successfully.

