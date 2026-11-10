---
id: T0218
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0218: Evaluate adopting DevopsCli from the released support-python v2.0.0, keeping project-specific actions through add_action

## Goals
Needs the released support-python v2.0.0; see `docs/migration-v2.md` in support-python for the full mapping.
Evaluate replacing `scripts/devops.py` with `DevopsCli` over the matching `PythonProject`, `GradleProject`, or `NodeProject` adapter.
Keep project-specific actions through `DevopsCli.add_action`.
Record the decision in the Execution Log, and adopt it in a follow-up task when it fits.

## Task Execution Steps
- [ ] **[Implement]** Implement required changes for T0218.
- [ ] **[Verify]**    Verify implementation with automated test suites.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.
