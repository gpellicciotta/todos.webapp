---
id: T0219
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-10T06:40:45Z"
ended_at: "2026-11-10T06:48:37Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-reviewer"
completion-commit: 84a238d545a82d339ad796bb89c3fa5e6e3adfb4
---
# T0219: Make a task added in All tasks join no list, even while the Lists filter selects lists

## Goals
A task added in All tasks joins no list, even while the Lists filter selects one or more lists.
Today it joins every list of the active Lists filter, which the user does not want.
The existing "Task added. Lists: … hides it." toast with Show covers a task the Lists filter hides.
List views keep adding the task to their own list (`TSK-9`, `LV-5`).
Details, declared files, size, and tests live in [technical-spec.md](T0219-make-a-task-added-in-all-tasks-join/technical-spec.md).

## Task Execution Steps
- [x] **[Implement]** Author unit and e2e tests that expect a task added under a Lists filter to join no list.
- [x] **[Verify]**    Run the new tests and record their failure before the implementation.
- [x] **[Implement]** Pass no lists to createTask from the All tasks add handler.
- [x] **[Verify]**    Run unit, e2e, lint, and service worker checks until green.
- [x] **[Doc]**       Update ui-design.md and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-10] **[Verify]**
  Red phase: the new unit and e2e tests fail before the implementation, as expected.
  - Unit: 1 failed, 24 passed; no hiding toast.
  - E2e: 1 failed; the task joined Home and Work.

- [2026-11-10] **[Verify]**
  Green phase: unit, full e2e, lint, and service worker checks pass; see validation-proof.md.
  - Unit: 1233 passed; one serve.test.js timing flake on an earlier run.
  - E2e: 196 passed on port 8819.

- [2026-11-10] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-10] **[Review]**
  Round 1 approved by @claude-reviewer.

- [2026-11-10] **[Review]**
  Agent review approved in round 1; two pre-existing toast gaps went to the backlog as follow-ups.

- [2026-11-10] **[Verify]**
  Recorded task outcomes.
  - Files touched: 7.
  - Lines touched: 73.
  - Reopenings: 0.

- [2026-11-10] **[Complete]**
  Task completed successfully.

