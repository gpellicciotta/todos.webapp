---
id: T0065
owner: "@claude"
session: claude-20261108-8fbe10
needs: []
branch: task/T0065-release-and-publish-all-changes-as-v0-3
worktree: .plan/work/T0065-release-and-publish-all-changes-as-v0-3
status: completed
started_at: "2026-11-08T09:23:39Z"
ended_at: "2026-11-08T09:59:05Z"
review: none
preview: none
protocol: adhoc
usage:
  worker: {turns: 2, duration_s: 34.0, input: 20, output: 2306, cache_read: 326774, cache_write: 43650}
work_duration: 27.3
completion-commit: 4894d8091e6fad16068258e03034cd986324e726
---
# T0065: Release (and publish) all changes as v0.3.0, via the devops.py script

## Goals
Release the v0.3.0 milestone with `python scripts/devops.py release 0.3.0 --backend-dir ../todos`.
The script finalizes the changelog and version files, tags `v0.3.0`, pushes `main`, `plan`, and the tag, and creates the GitHub release.
It also commits the pin `todosWebappVersion=0.3.0` in the todos repository, locally.
Never push or deploy the todos server; the user does that.
Human-gated: run this task with the user, never in an unattended work loop (`plan work --exclude T0065`).
Completion check: the Pages run for the tag is green, and Settings, About shows 0.3.0.

## Task Execution Steps
- [x] **[Read]**      Read the Release Procedure in docs/devops.md and the top entries of CHANGELOG.md.
- [x] **[Verify]**    Run the contract test against a local todos server and report any failure instead of releasing.
- [x] **[Verify]**    Check `GET /api/status` of the target server for `min-client-versions` that the release must meet.
- [x] **[Verify]**    Run the release with `--dry-run`, which runs the checks; report any failure and show the plan.
- [x] **[Decide]**    Obtain the user's confirmation to push `main`, `plan`, and the tag `v0.3.0`.
- [x] **[Implement]** Run the release with `--backend-dir ../todos` and the confirmation, then record its output.
- [x] **[Verify]**    Follow the Pages run, reload the site once, and check that the new worker is active.
- [x] **[Doc]**       Tell the user the manual steps left: deploy the todos server, then push its pin commit.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Same mechanics as the v0.2.0 release: pin commit in the todos repository, no push, no deploy.

- [2026-11-08] **[Verify]**
  Dry run blocked: stale SW hash manifest fixed; then 11 e2e tests failed. Release not run.
  - Contract test passed.
  - min-client-versions empty.

- [2026-11-08] **[Implement]**
  Released v0.3.0; Pages run green; pin committed locally in todos.server.
  - Files touched: 6.
  - Lines touched: 0.
  - Reopenings: 0.

- [2026-11-08] **[Verify]**
  Contract test passed; dry run passed after fixing stale manifest, e2e, flaky test, and formatting (T0210-T0212).

- [2026-11-08] **[Decided]**
  User confirmed the push of main, plan, and tag v0.3.0.

- [2026-11-08] **[Doc]**
  Manual steps left for the user: deploy the todos server, then push its pin commit.

- [2026-11-08] **[Complete]**
  Task completed successfully.

