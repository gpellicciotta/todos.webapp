---
id: T0275
owner: "@claude"
session: claude-20261117-882fc5
needs: []
branch: task/T0275-make-the-e2e-suite-stable-under-full-parallel
worktree: .plan/work/T0275-make-the-e2e-suite-stable-under-full-parallel
status: active
started_at: "2026-11-17T20:14:43Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0275: Make the e2e suite stable under full parallel load: all-tasks.spec.js:591 and sidebar-find.spec.js:43 each failed once

## Goals
Make `npm run test:e2e` pass reliably under full parallel load on a developer machine.
T0267 saw single failures in `all-tasks.spec.js:591` (the `task-row--added` class was gone) and `sidebar-find.spec.js:43`.
Each passed five times in a row alone, and the next full run passed.
Find the timing assumption each test makes, and make the wait deterministic.
Completion check: three consecutive `python scripts/devops.py check` runs pass.
Size estimate: 2 files, 40 lines.

### Tests
- Unit: none (only browser timing shows the defect).
- Integration: both specs with `--repeat-each 10`, then three full e2e runs.

## Task Execution Steps
- [ ] **[Implement]** Implement required changes for T0275.
- [ ] **[Verify]**    Verify implementation with automated test suites.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.
