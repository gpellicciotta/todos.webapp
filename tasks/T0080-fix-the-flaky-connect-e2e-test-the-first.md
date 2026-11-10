---
id: T0080
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-10T09:22:20Z"
ended_at: "2026-11-10T09:23:15Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-subagent"
completion-commit: 0cf4981f2fa235a4d48d143b83db24e1f46bd48a
---
# T0080: Fix the flaky connect e2e test: the first sync pull adds a second GET /api/users/me to the recorded calls

## Goals
Fix the flaky connect e2e test: the first sync pull adds a second GET /api/users/me to the recorded calls.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0080.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-08] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-10] **[Implement]**
  No new change needed; commit bd249d8 already limits the assertion to the first three service calls.
  - Files touched: 0.
  - Lines touched: 0.
  - Reopenings: 0.

- [2026-11-10] **[Verify]**
  Connect spec passed 70 of 70 runs locally with 10 repeats; latest CI run passed.

- [2026-11-10] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-10] **[Review]**
  Round 1 approved by @claude-subagent.

- [2026-11-10] **[Complete]**
  Task completed successfully.

