---
id: T0264
owner: ~
needs: [T0263]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0264: Redesign the task row as a description line plus a meta line, with overdue due text in orange

## Goals
Rebuild the task row as variant C, by the Task Row Layout rules in T0257's signed-off brief.
- Line 1 holds the status button and the description, wrapping to at most 2 lines.
- Line 2 holds the counts, the due or repeat icon with its text, and the lists, only when it has content.
- Overdue due text and its clock show in orange; in-time ones stay muted.
- The row drops the note count and the people icon.
- The More button stays until T0265.
- Rules and tests: [technical-spec.md](T0264-redesign-the-task-row-as-a-description-line/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read T0257's signed-off brief and canvas variant C, metaOf in task-list.js, and the row styles.
- [ ] **[Implement]** Author failing unit and e2e tests for the two lines, the meta line content, and overdue color.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the description line, the meta line, and the overdue style.
- [ ] **[Verify]**    Run the unit suite and the All tasks and gallery e2e specs and confirm they pass.
- [ ] **[Visual]**    Capture rows at 360, 768, and 1440 px, with overdue and recurring rows, in both themes.
- [ ] **[Doc]**       Update the Task Row section, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the row layout and reordering agreed in T0257.

