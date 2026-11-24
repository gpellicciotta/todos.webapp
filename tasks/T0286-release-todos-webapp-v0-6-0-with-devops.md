---
id: T0286
owner: "@claude-code"
session: claude-20261124-734a42
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-24T15:20:45Z"
ended_at: "2026-11-24T15:38:22Z"
review: agent
preview: none
protocol: adhoc
work_duration: 587.3
contributors: "@claude"
review_status: approved
review_round: 1
review_requested_at: "2026-11-24T15:35:51Z"
reviewed_by: "@gemini"
review_session: antigravity-20261124-272769
completion-commit: 590802fcafd5f6994cb0f2cd0d1bd7603a43912d
---
# T0286: Release todos.webapp v0.6.0 with devops release, push main, the tag, and plan, and publish the GitHub release

## Goals
Release v0.6.0 from main with `python scripts/devops.py release 0.6.0 --backend-dir ../todos`, then publish it.
- The user authorized the publish on 2026-11-17: push main with the tag, push plan, and create the GitHub release.
- Rename the `-pre` changelog heading to v0.6.0 first if the release procedure requires it; keep every entry.
- Run `release 0.6.0 --dry-run --backend-dir ../todos` first; publish only when it passes.
- Answer the y/N question with `--yes`; stop and suspend on any failed precondition or check.
- Completion check: tag `v0.6.0` exists on `origin` and the GitHub release v0.6.0 is published.
- Size estimate: 1 files, 20 lines.

## Task Execution Steps
- [x] **[Read]**      Read docs/devops.md Release Procedure and confirm the -pre heading, versions, and clean main.
- [x] **[Verify]**    Run the release dry run for 0.6.0 and confirm every precondition and check passes.
- [x] **[Doc]**       Cut the release with devops release 0.6.0 and --yes, then verify the tag and GitHub release.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Verify]**
  Dry run for 0.6.0 passed every precondition and check; backend dir is ../todos.server since ../todos no longer exists.
  - Unit 1819, e2e 282, pytest 215 passed.

- [2026-11-24] **[Verify]**
  Dry run failed at check:sw because T0297 changed all-tasks.js without a VERSION bump; bumped VERSION to 2026-11-24.11 in a fix commit.

- [2026-11-24] **[Doc]**
  Released v0.6.0: pushed main with the tag and plan, published the GitHub release, and committed the todos.server pin locally.

- [2026-11-24] **[Verify]**
  The v0.6.0 Pages run failed like every run since 2026-11-17: four unit tests expect 24-hour clock text; T0298 tracks the fix.

- [2026-11-24] **[Verify]**
  Recorded task outcomes.
  - Files touched: 1.
  - Lines touched: 2.
  - Reopenings: 0.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-24] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0286-release-todos-webapp-v0-6-0-with-devops/review-findings-1.md).

- [2026-11-24] **[Complete]**
  Task completed successfully.

