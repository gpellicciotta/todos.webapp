---
id: T0223
owner: "@claude"
session: claude-20261115-594a29
needs: []
branch: task/T0223-improve-task-group-headers-with-more-padding-an
worktree: .plan/work/T0223-improve-task-group-headers-with-more-padding-an
status: active
started_at: "2026-11-15T01:50:06Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 2295.4, input: 340, output: 110026, cache_read: 22404276, cache_write: 341724}
  review: {turns: 4, duration_s: 246.2, input: 0, output: 0, cache_read: 0}
review_status: pending
review_round: 1
review_requested_at: "2026-11-15T02:09:30Z"
work_duration: 1349.9
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
- [x] **[Read]**      Read the group header render code, the list virtualization, and the visual style guide.
- [x] **[Decide]**    Decide the total source for "n of m" and where collapsed state persists.
- [x] **[Implement]** Author failing unit and e2e tests for padding, count format, and collapse.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Add header padding, "n of m" count, and the collapse toggle.
- [x] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [x] **[Visual]**    Inspect the headers at narrow and wide widths in light and dark themes.
- [x] **[Doc]**       Update the visual style guide, UI design spec, wireframes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-15] **[Decided]**
  Total m counts the group's members among all view tasks before filters, as the info line total does; groupTasks gains an optional all-tasks argument.

- [2026-11-15] **[Decided]**
  Collapsed groups live in memory per task list, keyed by group key; they survive re-renders and filter changes but not reloads or navigation.

- [2026-11-15] **[Verify]**
  Wrote failing unit and e2e tests; five unit tests and the list e2e test failed on missing toggles and totals.

- [2026-11-15] **[Implement]**
  Added 12 px toggle padding, n of m counts from groupTasks totals, and in-memory collapsible groups in the virtual list.

- [2026-11-15] **[Verify]**
  Unit, lint, wireframe, and affected e2e suites pass; Ruff could not run, as its local binary is missing.
  - npm test: 1233 passed.
  - Affected e2e specs: 64 passed.
  - Proof in validation-proof.md.

- [2026-11-15] **[Visual]**
  Compared before and after shots at 390 and 1440 px in light and dark; see validation-proof.md for links.

- [2026-11-15] **[Doc]**
  Updated the visual style guide, UI design spec, requirements VO-10 and VO-15, the view options wireframe, and CHANGELOG.md.

- [2026-11-15] **[Implement]**
  Size note: crossed the typical line at 15 files and 427 lines; the header, count source, tests, and docs cannot merge apart.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 15.
  - Lines touched: 427.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 1 requested (mode: agent).

