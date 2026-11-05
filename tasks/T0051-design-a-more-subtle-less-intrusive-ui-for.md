---
id: T0051
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-05T11:15:55Z"
ended_at: "2026-11-05T18:21:16Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@gpellicciotta"
completion-commit: ce5fdb117017d14762e1f7f313493810e4efb9b7
---
# T0051: Design a more subtle, less intrusive UI for searching, filtering, and grouping

## Goals
Design a less intrusive way to search, filter, and group tasks than the always-visible control bar.
Deliver wireframes, interaction rules, and updated requirements for review.
Implementation is a separate follow-up task, created after sign-off.
Completion check: markdown lint on changed docs, then design approval by the user.

## Task Execution Steps
- [x] **[Read]**      Read view-controls.js, the current TV requirements, and ui-design.md.
- [x] **[Decide]**    Compare at least two designs and recommend one with trade-offs.
- [x] **[Doc]**       Add wireframes for desktop and compact layouts to ui-design.md.
- [x] **[Doc]**       Update the TV requirements and the grouping control rules in requirements.md.
- [x] **[Doc]**       Create the implementation task and name T0048 as its first consumer.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-05] **[Decided]**
  Chose a quiet view bar with one View panel and tokens over three buttons or a query field.
  - Alternatives recorded in ui-design.md.

- [2026-11-05] **[Doc]**
  Touched undeclared draw-wireframes.py and visual-style-guide.md; size stays under typical line.
  - Mechanical command: python scripts/draw-wireframes.py docs/img/ui.

- [2026-11-05] **[Decide]**
  Revised the design: the add field also searches, so the view bar keeps only count and View.
  - Enter still adds; Add anyway guards exact duplicates.

- [2026-11-05] **[Decided]**
  Moved view options to the side panel behind the More menu; only the Add button adds.
  - Info line under the field replaces the view bar.
  - Per-list memory deferred to a backlog task.

- [2026-11-05] **[Doc]**
  Created implementation tasks T0054 and T0055; T0048 now needs T0054. User approved the design.
  - Backlog task T0053 holds per-list view options.

- [2026-11-05] **[Verify]**
  Recorded task outcomes.
  - Files touched: 6.
  - Lines touched: 379.
  - Reopenings: 0.

- [2026-11-05] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-05] **[Review]**
  Round 1 approved by @gpellicciotta: Design has been reviewed and approved.

- [2026-11-05] **[Complete]**
  Task completed successfully.

