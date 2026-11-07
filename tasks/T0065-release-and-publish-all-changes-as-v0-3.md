---
id: T0065
owner: ~
needs: ['T0027', 'T0028', 'T0043', 'T0053', 'T0056', 'T0062', 'T0063']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: none
preview: none
protocol: adhoc
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
- [ ] **[Read]**      Read the Release Procedure in docs/devops.md and the top entries of CHANGELOG.md.
- [ ] **[Verify]**    Run `python scripts/devops.py check` and the contract test, and report any failure instead of releasing.
- [ ] **[Verify]**    Check `GET /api/status` of the target server for `min-client-versions` that the release must meet.
- [ ] **[Verify]**    Run the release with `--dry-run` and show its plan to the user.
- [ ] **[Decide]**    Obtain the user's confirmation to push `main`, `plan`, and the tag `v0.3.0`.
- [ ] **[Implement]** Run the release with `--backend-dir ../todos` and the confirmation, then record its output.
- [ ] **[Verify]**    Follow the Pages run, reload the site once, and check that the new worker is active.
- [ ] **[Doc]**       Tell the user the manual steps left: deploy the todos server, then push its pin commit.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Same mechanics as the v0.2.0 release: pin commit in the todos repository, no push, no deploy.
