---
id: T0257
owner: "@claude"
session: claude-20261117-2c6785
needs: []
branch: task/T0257-design-a-tabbed-task-editor-and-a-clearer
worktree: .plan/work/T0257-design-a-tabbed-task-editor-and-a-clearer
status: suspended
started_at: "2026-11-17T01:01:48Z"
ended_at: —
review: human
preview: none
protocol: standard
usage:
  worker: {turns: 9, duration_s: 343.6, input: 84, output: 31220, cache_read: 4111375, cache_write: 256305}
work_duration: 33597.6
review_status: rejected
review_round: 1
reviewed_by: "@giovanni"
---
# T0257: Design a tabbed task editor and a clearer status and count interaction, with wireframes and human sign-off

## Goals
Produce a signed-off design for a tabbed task editor, the task row, and a clear status and count interaction.
- The user agreed the status, count, and tab model on 2026-11-16; it is recorded in the brief.
- The 2 of 3 report is the editor tick button previewing the completed icon, not a rendering bug.
- The row layout, variant C, and row reordering were agreed on 2026-11-16.
- Wireframe the tabbed editor and the row at desktop panel and phone widths.
- Deliverables: updated Task Row and Task Editor sections, requirements, and wireframes.
- Design only: no app code changes; on sign-off, revise T0258 to T0265 to match.
- Brief: [technical-spec.md](T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the Task Row and Task Editor designs, task-list.js, task-editor.js, and occurrences.js.
- [x] **[Read]**      Confirm in the app that the editor tick button's completed icon at 2 of 3 caused the report.
- [x] **[Decide]**    Discuss the task row redesign with the user and record the decisions in the brief.
- [x] **[Doc]**       Wireframe the tabbed editor and the row in draw-wireframes.py, at desktop panel and phone widths.
- [x] **[Doc]**       Update the Task Row and Task Editor sections of the UI design and the affected requirements.
- [ ] **[Doc]**       Revise T0258 to T0265 to the signed-off design, keeping each within the size lines.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Review]**
  Review raised from agent to human.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and the design brief from the user's editor and status feedback.

- [2026-11-16] **[Doc]**
  Recorded the status, count, and tab model agreed with the user, and filed T0258 to T0262 behind this task.

- [2026-11-16] **[Doc]**
  Recorded the variant C row layout and row reordering agreed with the user, and filed T0263 to T0265.

- [2026-11-16] **[Decided]**
  Settled Alt+Home and Alt+End for tasks and lists, the meta line count, and a relaxed visible-alternative principle.

- [2026-11-16] **[Decided]**
  Moved the row count into a corner badge on the status icon and dropped the row count popover, cancelling T0261.

- [2026-11-16] **[Read]**
  Read the Task Row and Task Editor designs, the tick and status code, and the current task editor wireframe.

- [2026-11-16] **[Doc]**
  Drew three task editor Status tab options on the design canvas for the user to choose from.
  - Options: underline tabs, compact stepper, summary card.

- [2026-11-17] **[Decided]**
  Chose underline tabs for the editor, with the More button ending the tab strip, also on phones.

- [2026-11-17] **[Doc]**
  Redrew rows and editor tabs; updated ui-design.md and requirements.md; wireframe tests pass.
  - Added TSK-18 and TSK-19.

- [2026-11-17] **[Doc]**
  Left T0258 to T0265 unrevised, since the brief revises them only after sign-off.

- [2026-11-17] **[Review]**
  Round 1 rejected by @giovanni: Rejected; feedback in review-feedback-1.md: Content tab only description and notes, lists and Delete move to Status, separate Status sections, right-align row list chips, fix all-tasks.svg Add text.

- [2026-11-17] **[Doc]**
  Reworked per round 1: Content has description and notes; Status has lists, groups, Delete; row lists right-aligned.
  - Fixed the all-tasks filter note; 101 wireframe tests pass.

