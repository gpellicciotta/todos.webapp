---
id: T0018
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T19:05:22Z"
ended_at: —
review: agent
preview: none
protocol: standard
review_status: rejected
review_round: 1
reviewed_by: "@claude-review-agent"
---
# T0018: Build the task editor panel with description, status, due time, overdue behavior, lists, notes, and delete

## Goals
Build the task editor per docs/specs/ui-design.md and its wireframe task-editor.svg.
Open it as the right panel in wide layouts and as a full screen in compact layouts.
Save every field on change, with field errors for invalid values (`TSK-1` to `TSK-12`).
Add the notes thread with the add note field on top, newest first (`NOT-1` to `NOT-5`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's Task Editor section and the task editor wireframe.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the editor panel, the task editor, and the notes thread.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-04] **[Verify]**
  Size note: the working diff reached about 1326 counted lines in 9 files, past the 1100 stop line; work stopped for a split.
  - Implementation done; new unit and e2e tests pass.
  - Proposed split: move the notes thread to its own task.

- [2026-11-04] **[Visual]**
  Captured before and after screenshots at 390 and 1440 px in both themes; deleted-task fields now stay readable.
  - Before: [1440 light](T0018-build-the-task-editor-panel-with-description-status/screenshots/task-editor-1440-light-before.png).
  - After: [1440 light](T0018-build-the-task-editor-panel-with-description-status/screenshots/task-editor-1440-light-after.png).

- [2026-11-04] **[Verify]**
  Size note: the final diff holds 1347 counted lines in 9 files, above the large line but under three times the estimate.
  - The coordinator chose no split; the editor and notes form one screen.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 rejected by @claude-review-agent: Partial dates save on each keystroke in the due date and time fields, which can trigger overdue cancellation; minor notes on refresh after destroy and Escape in notes.

