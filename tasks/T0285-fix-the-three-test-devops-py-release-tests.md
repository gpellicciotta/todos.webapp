---
id: T0285
owner: "@claude"
session: claude-20261118-a677d3
needs: []
branch: task/T0285-fix-the-three-test-devops-py-release-tests
worktree: .plan/work/T0285-fix-the-three-test-devops-py-release-tests
status: active
started_at: "2026-11-17T23:04:23Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0285: Fix the three test_devops.py release tests failing on main at 1ee04e2, including the release dry run

## Goals
Fix the three test_devops.py release tests failing on main at 1ee04e2, including the release dry run.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0285.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-18] **[Implement]**
  Release action now calls TodosProject.release with every option; global support-python 3.1.0 dropped skip options, causing all three failures.
  - New test mimics the 3.1.0 forwarding.

- [2026-11-18] **[Verify]**
  Devops tests pass on support-python 3.1.0 and v3.3.0; full pytest and Ruff pass.
  - 89 passed on each version.
  - 190 passed in tests.

- [2026-11-18] **[Verify]**
  Recorded task outcomes.
  - Files touched: 2.
  - Lines touched: 26.
  - Reopenings: 0.

