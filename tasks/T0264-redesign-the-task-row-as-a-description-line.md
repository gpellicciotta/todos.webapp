---
id: T0264
owner: "@claude"
session: claude-20261117-16be50
needs: []
branch: task/T0264-redesign-the-task-row-as-a-description-line
worktree: .plan/work/T0264-redesign-the-task-row-as-a-description-line
status: completed
started_at: "2026-11-17T14:30:05Z"
ended_at: "2026-11-17T15:09:08Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 3, duration_s: 2052.7, input: 30, output: 11583, cache_read: 3331516, cache_write: 22511}
  review: {turns: 1, duration_s: 192.9, input: 34, output: 6180, cache_read: 1095149, cache_write: 60606}
work_duration: 2343.7
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T15:05:46Z"
reviewed_by: "@claude"
review_session: claude-20261117-05b892
completion-commit: f2da857c5988d7397544aea52cfea7f033316e5b
---
# T0264: Redesign the task row as a description line plus a meta line, with overdue due text in orange

## Goals
Rebuild the task row as variant C, by the Task Row Layout rules in T0257's signed-off brief.
- Line 1 holds the status button and the description, wrapping to at most 2 lines.
- Above target 1, a corner badge on the status icon shows the counts, such as 2/3.
- Line 2 holds the due or repeat chip, left-aligned, and the lists, right-aligned, only when it has content.
- Overdue due text and its clock show in orange; in-time ones stay muted.
- The row drops the note count and the people icon.
- The More button stays until T0265.
- Rules and tests: [technical-spec.md](T0264-redesign-the-task-row-as-a-description-line/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read T0257's signed-off brief and canvas variant C, metaOf in task-list.js, and the row styles.
- [x] **[Implement]** Author failing unit and e2e tests for the two lines, the count badge, the meta line, and overdue color.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the description line, the count badge, the meta line, and the overdue style.
- [x] **[Verify]**    Run the unit suite and the All tasks and gallery e2e specs and confirm they pass.
- [x] **[Visual]**    Capture rows at 360, 768, and 1440 px, with overdue and recurring rows, in both themes.
- [x] **[Doc]**       Update the Task Row section, the gallery, the style guide, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the row layout and reordering agreed in T0257.

- [2026-11-16] **[Doc]**
  Added the corner count badge from T0257 and took the counts out of the meta line.

- [2026-11-17] **[Implement]**
  Rebuilt the row as a 2-line clamped description over a meta line, with a status-tinted count badge and orange overdue due text.
  - Added a repeat icon to the sprite.
  - Undeclared files: icons.svg, service-worker.js, hashes, three test files.

- [2026-11-17] **[Verify]**
  Unit suite, lint, SW check, and the All tasks, gallery, and long-list specs pass; full e2e has one pre-existing T0258 failure, tracked as T0280.
  - Proof in validation-proof.md, screenshots in screenshots/.

- [2026-11-17] **[Doc]**
  Size note: 13 counted files and 830 lines, above the typical line; tests and gallery specimens cannot merge separately from the row change.
  - Files touched: 14.
  - Lines touched: 838.
  - Reopenings: 0.

- [2026-11-17] **[Visual]**
  Captured rows before and after at 360, 768, and 1440 px in both themes; see validation-proof.md.
  - [After 360 light](T0264-redesign-the-task-row-as-a-description-line/screenshots/after-360-light.png).
  - [Before 360 light](T0264-redesign-the-task-row-as-a-description-line/screenshots/before-360-light.png).

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @claude: Approved.
  - Findings: [review-findings-1.md](T0264-redesign-the-task-row-as-a-description-line/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

