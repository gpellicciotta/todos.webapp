---
id: T0024
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T20:50:57Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0024: Add the connect flow: Auth sign-in, session token handling, server URL setting, and disconnect

## Goals
Build the connect screen per docs/specs/ui-design.md, signing in through the Auth service (`CON-1` to `CON-3`).
Store the session token, handle expiry without blocking local work, and delete it on disconnect (`CON-13`, `TEC-18`).
Make the server URL changeable only while disconnected (`CON-11`, `CON-12`).
Implement disconnect with the pending-changes warning; data adoption and sync come with the sync tasks.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Connecting section, ui-design.md's connect flows, and the Auth service integration notes.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the session module and the connect screen, and wire Connect and Disconnect in Settings.
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

- [2026-11-04] **[Read]**
  Traced the Auth contract through the Auth web API, the legacy SPA, support.js, and the ToDo's callback; four open service points remain.

- [2026-11-04] **[Verify]**
  Red phase: the unit suite fails on the missing auth module; seven connect and settings end-to-end tests fail, four settings tests pass.

