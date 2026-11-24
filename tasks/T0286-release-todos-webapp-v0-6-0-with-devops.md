---
id: T0286
owner: "@claude"
needs: []
branch: task/T0286-release-todos-webapp-v0-6-0-with-devops
worktree: .plan/work/T0286-release-todos-webapp-v0-6-0-with-devops
status: active
started_at: "2026-11-24T14:48:52Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read docs/devops.md Release Procedure and confirm the -pre heading, versions, and clean main.
- [ ] **[Verify]**    Run the release dry run for 0.6.0 and confirm every precondition and check passes.
- [ ] **[Doc]**       Cut the release with devops release 0.6.0 and --yes, then verify the tag and GitHub release.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.
