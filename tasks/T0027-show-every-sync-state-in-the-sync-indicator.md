---
id: T0027
owner: ~
needs: [T0026]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0027: Show every sync state in the sync indicator and build the Sync log screen

## Goals
Drive the sync indicator from the sync engine: Local only, Synced, Syncing, Offline, Sign in needed, and Sync error (`SYN-4`).
Show the unseen-entries dot, the popover with Sync now and Retry, and the session banner.
Build the Sync log screen per docs/specs/ui-design.md and its wireframe sync-log.svg (`SYN-8`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's Sync Indicator, Sync Log, and syncing flows.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the sync indicator view and the Sync log screen.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

