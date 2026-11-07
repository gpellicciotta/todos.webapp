---
id: T0027
owner: "@claude"
session: claude-20261107-181c20
needs: []
branch: task/T0027-show-every-sync-state-in-the-sync-indicator
worktree: .plan/work/T0027-show-every-sync-state-in-the-sync-indicator
status: active
started_at: "2026-11-07T21:34:39Z"
ended_at: —
review: agent
preview: none
protocol: standard
size_status: approved
size_estimate: 37 files, 1694 lines
usage:
  worker: {turns: 2, duration_s: 1980.4, input: 296, output: 130504, cache_read: 21865814, cache_write: 393480}
work_duration: 1002.7
size_approved: 37 files, 1694 lines
size_approved_by: "@gpellicciotta"
size_approved_at: "2026-11-07T21:27:59Z"
---
# T0027: Show every sync state in the sync indicator and build the Sync log screen

## Goals
Drive the sync indicator from the sync engine: Local only, Synced, Syncing, Offline, Sign in needed, Sync error, and Update required (`SYN-4`, `SYN-11`).
Show the unseen-entries dot, the popover with Sync now and Retry, and the session banner.
Build the Sync log screen per docs/specs/ui-design.md and its wireframe sync-log.svg (`SYN-8`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's Sync Indicator, Sync Log, and syncing flows.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the sync indicator view and the Sync log screen.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [x] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-07] **[Decided]**
  Placed the sync indicator beside the user button, before the bell; Update required uses the alert icon; strings stay per module as strings.js does not exist yet.

- [2026-11-07] **[Implement]**
  Size note: about 1600 counted lines in 22 files, above the 10-file estimate; the indicator, banner, log screen, shell wiring, and tests share one state.
  - Also changed: push.js, settings.js, user-menu.js, draw-wireframes.py.

- [2026-11-07] **[Verify]**
  Full unit, lint, e2e, and wireframe tests pass; the wireframe test change was written with its code.
  - 1069 unit, 178 e2e, 117 pytest.

- [2026-11-07] **[Read]**
  Read the Sync Indicator, Sync Log, and Syncing sections of ui-design.md and the engine.

- [2026-11-07] **[Visual]**
  Captured before and after screenshots at 390 and 1440 px, light and dark.
  - Stored in the companion screenshots folder.

- [2026-11-07] **[Doc]**
  Updated ui-design.md, the wireframes, and CHANGELOG.md.

- [2026-11-07] **[Size]**
  Size approval requested by the work loop: 37 files, 1694 lines exceeds 3x the approved 10 files, 600 lines.

- [2026-11-07] **[Size]**
  Size approved by @gpellicciotta for 37 files, 1694 lines.

