---
id: T0210
owner: "@claude"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-08T09:28:52Z"
ended_at: "2026-11-08T09:34:58Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@claude-subagent"
completion-commit: cb85d57373707c83b696e5464a224d6f366fab78
---
# T0210: Fix the 11 failing e2e tests: avatar button overlapping the sync indicator and controls under 44 px

## Goals
Fix the 11 failing e2e tests: avatar button overlapping the sync indicator and controls under 44 px.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0210.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-08] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Implement]**
  Restored sync indicator clicks, 44 px targets, and shell test expectations; e2e suite green.

- [2026-11-08] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-08] **[Review]**
  Round 1 approved by @claude-subagent.

- [2026-11-08] **[Review]**
  Subagent approved; notes: Reset margin overlap and 18 px indicator accepted.

- [2026-11-08] **[Verify]**
  Recorded task outcomes.
  - Files touched: 4.
  - Lines touched: 21.
  - Reopenings: 0.

- [2026-11-08] **[Review]**
  Round 2 requested (mode: agent); the work changed after the round 1 approval of commit 9c8970e.

- [2026-11-08] **[Review]**
  Round 2 approved by @claude-subagent.

- [2026-11-08] **[Complete]**
  Task completed successfully.

