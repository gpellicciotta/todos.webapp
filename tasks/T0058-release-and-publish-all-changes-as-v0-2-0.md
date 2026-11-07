---
id: T0058
owner: ~
needs: [T0057, T0055, T0046, T0048]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: none
preview: none
protocol: adhoc
---
# T0058: Release (and publish) all changes as v0.2.0, via the devops.py script

## Goals
Release the v0.2.0 milestone with `python scripts/devops.py release 0.2.0 --backend-dir ../todos`.
The script finalizes the changelog and version files, tags `v0.2.0`, pushes `main`, `plan`, and the tag, and creates the GitHub release.
It also commits the pin `todosWebappVersion=0.2.0` in the todos repository, locally.
Never push or deploy the todos server; the user does that.
Human-gated: run this task with the user, never in an unattended work loop (`plan work --exclude T0058`).
Completion check: the Pages run for the tag is green, and Settings, About shows 0.2.0.

## Task Execution Steps
- [ ] **[Read]**      Read the Release Procedure in docs/devops.md and the top entries of CHANGELOG.md.
- [ ] **[Verify]**    Run the release with `--dry-run`, which runs the checks; report any failure and show the plan.
- [ ] **[Decide]**    Obtain the user's confirmation to push `main`, `plan`, and the tag `v0.2.0`.
- [ ] **[Implement]** Run the release with `--backend-dir ../todos` and the confirmation, then record its output.
- [ ] **[Verify]**    Follow the Pages run, reload the site once, and check that the new worker is active.
- [ ] **[Doc]**       Tell the user the manual steps left: deploy the todos server, then push its pin commit.

## Execution Log
- [2026-11-07] **[Doc]**
  Task file written by hand: the plan CLI cannot scaffold a file for an existing task line.

- [2026-11-07] **[Decided]**
  The user approved the pin bump in the todos repository as part of this release, but no deploy and no push of that repository.
