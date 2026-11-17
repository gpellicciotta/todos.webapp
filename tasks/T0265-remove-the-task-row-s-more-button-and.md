---
id: T0265
owner: "@claude"
needs: []
branch: task/T0265-remove-the-task-row-s-more-button-and
worktree: .plan/work/T0265-remove-the-task-row-s-more-button-and
status: active
started_at: "2026-11-17T16:10:37Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0265: Remove the task row's More button and menu, now that the editor and the move keys cover them

## Goals
Remove the row's More button and menu, by the Task Row Layout rules in T0257's signed-off brief.
- Add to list and Remove from this list live in the Lists section of the editor's Status tab.
- Delete lives at the bottom of the editor's Status tab once T0262 lands, and at the editor's bottom before that.
- Move up and Move down give way to the drags and Alt keys of T0263.
- Rules and tests: [technical-spec.md](T0265-remove-the-task-row-s-more-button-and/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read T0257's signed-off brief, the More menu code in task-list.js, and its tests.
- [ ] **[Implement]** Change the unit and e2e tests to expect no More button, and move their flows to the editor.
- [ ] **[Verify]**    Run the changed tests and confirm they fail while the More menu still exists.
- [ ] **[Implement]** Remove the More button, its menu, its entries, and its styles.
- [ ] **[Verify]**    Run the unit suite and the All tasks and list e2e specs and confirm they pass.
- [ ] **[Visual]**    Capture rows without the More button at 360 and 1440 px, in both themes.
- [ ] **[Doc]**       Update the Task Row and List sections, the requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the row layout and reordering agreed in T0257.

