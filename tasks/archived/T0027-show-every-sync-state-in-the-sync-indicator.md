---
id: T0027
owner: "@claude"
session: claude-20261107-181c20
needs: []
branch: task/T0027-show-every-sync-state-in-the-sync-indicator
worktree: .plan/work/T0027-show-every-sync-state-in-the-sync-indicator
status: completed
started_at: "2026-11-07T21:34:39Z"
ended_at: "2026-11-07T21:39:54Z"
review: agent
preview: none
protocol: standard
size_status: approved
size_estimate: 37 files, 1694 lines
usage:
  worker: {turns: 4, duration_s: 2001.8, input: 308, output: 131640, cache_read: 23167626, cache_write: 406604}
  review: {turns: 2, duration_s: 569.0, input: 317122, output: 15958, cache_read: 3421976}
work_duration: 1285.4
size_approved: 37 files, 1694 lines
size_approved_by: "@gpellicciotta"
size_approved_at: "2026-11-07T21:27:59Z"
review_status: approved
review_round: 1
reviewed_by: "@gemini"
completion-commit: e8b321dc914636e21a3442bf5cde3817616fa013
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
- [x] **[Review]**    Obtain review approval of the finished work before completion.

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

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 approved by @gemini: Verified the sync indicator ([sync-indicator.js](../../../src/js/views/sync-indicator.js)), the Sync log screen ([sync-log.js](../../../src/js/views/sync-log.js)), shell and settings integration, styles, wireframes, and documentation against `SYN-4`,.
  - Findings: [review-findings-1.md](T0027-show-every-sync-state-in-the-sync-indicator/review-findings-1.md).

- [2026-11-07] **[Complete]**
  Task completed successfully.

