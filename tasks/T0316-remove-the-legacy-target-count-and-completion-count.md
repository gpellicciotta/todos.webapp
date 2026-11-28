---
id: T0316
owner: "@claude"
needs: []
branch: task/T0316-remove-the-legacy-target-count-and-completion-count
worktree: .plan/work/T0316-remove-the-legacy-target-count-and-completion-count
status: active
started_at: "2026-11-28T09:01:32Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0316: Remove the legacy target-count and completion-count fields once every reader uses goals and progress

## Goals
Remove the `target-count` and `completion-count` mirrors that T0313 kept.
Every reader uses the goal fields and `progress`, as docs/specs/local-store.md specifies.
Keep reading both fields where old backups and queued legacy changes require them.
Delete legacy fold functions without callers.
Rules, files, and tests: [technical-spec.md](T0316-remove-the-legacy-target-count-and-completion-count/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Search src and tests for the legacy fields and the legacy fold functions.
- [ ] **[Implement]** Change the remaining readers and tests, and remove the mirrors.
- [ ] **[Verify]**    Run `python scripts/devops.py check` and `npm run test:e2e` and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.
