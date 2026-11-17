---
id: T0264
owner: "@claude"
session: claude-20261117-16be50
needs: []
branch: task/T0264-redesign-the-task-row-as-a-description-line
worktree: .plan/work/T0264-redesign-the-task-row-as-a-description-line
status: active
started_at: "2026-11-17T14:30:05Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Verify]**    Run the unit suite and the All tasks and gallery e2e specs and confirm they pass.
- [x] **[Visual]**    Capture rows at 360, 768, and 1440 px, with overdue and recurring rows, in both themes.
- [ ] **[Doc]**       Update the Task Row section, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

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

