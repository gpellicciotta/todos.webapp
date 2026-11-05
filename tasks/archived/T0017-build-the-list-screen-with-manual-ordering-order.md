---
id: T0017
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T20:24:06Z"
ended_at: "2026-11-04T20:44:14Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 90609621a569a061dfb2b0d53323a0454b832023
---
# T0017: Build the List screen with manual ordering, order buttons, drag and keyboard moves, and the status filter

## Goals
Build the list view per docs/specs/ui-design.md and its wireframe list.svg (`LV-1` to `LV-10`).
Support drag and drop on pointer devices, and Move up, Move down, Alt+Up, and Alt+Down everywhere.
Order buttons sort the view only; Manual restores the stored order and enables moving again.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's List screen and the list wireframe.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the list view and the reorder module, and reuse the shared task list.
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

- [2026-11-04] **[Implement]**
  Built list.js and reorder.js, added handles, Move up, Move down, and Remove from this list to task-list.js, and registered the screen.
  - Undeclared: app.js, service-worker.js, views.css, ui-design.md, shell.spec.js.
  - shell.spec.js now expects rows in the filled list view.

- [2026-11-04] **[Verify]**
  Red phase failed as expected; npm test, eslint, check:sw, and all 98 Playwright tests passed afterwards.
  - Proof: validation-proof.md.

- [2026-11-04] **[Visual]**
  Captured the list at 390 and 1440 px in light and dark, before and after, with no console errors.
  - Before: [list-1440-light-before](T0017-build-the-list-screen-with-manual-ordering-order/list-1440-light-before.png).
  - After: [list-1440-light-after](T0017-build-the-list-screen-with-manual-ordering-order/list-1440-light-after.png).

- [2026-11-04] **[Doc]**
  Updated ui-design.md with the order directions, shared per-device state, move announcements, compact More button, and Delete list.

- [2026-11-04] **[Verify]**
  Size note: the diff crossed the typical line; the view, reorder module, and tests cannot merge apart.
  - Files touched: 10.
  - Lines touched: 917.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Agent review approved; drag autoscroll and dialog cleanup went to T0038, the Share scroll target to T0028.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

