---
id: T0223
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0223: Improve task group headers with more padding, an 'n of m' count, and collapsible groups

## Goals
Improve the group headers of the task list in three ways.
- Increase the header's inline padding so the name and count sit clear of the border.
- Show the count as "6 of 10" while a filter hides tasks of the group; otherwise show "10".
- Let the user collapse and expand each group, hiding its rows under the header.

Completion check: `npm run test:unit` and the list e2e spec pass.
Size estimate: 5 files, 150 lines.
Combined task: all three changes edit the same header element and one render function.

## Task Execution Steps
- [ ] **[Read]**      Read the group header render code, the list virtualization, and the visual style guide.
- [ ] **[Decide]**    Decide the total source for "n of m" and where collapsed state persists.
- [ ] **[Implement]** Author failing unit and e2e tests for padding, count format, and collapse.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Add header padding, "n of m" count, and the collapse toggle.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Inspect the headers at narrow and wide widths in light and dark themes.
- [ ] **[Doc]**       Update the visual style guide, UI design spec, wireframes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.
