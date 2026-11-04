---
id: T0038
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T21:05:43Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0038: Keep the task screens fast with 5000 tasks: keyed row reuse, debounced search, and due chip updates

## Goals
Meet `TEC-16`: views open within 200 ms with 5000 tasks; the T0016 review measured 1085 ms on desktop.
Reuse rendered rows by task id instead of rebuilding every row on each store change.
Debounce search input, and let the minute tick update only due chips and overdue marks.
Apply the open minor review notes from T0035, T0037, and T0016 listed in technical-spec.md.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the T0016 review's performance numbers and the task list, view controls, and All tasks modules.
- [ ] **[Implement]** Write the failing performance and regression tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Reuse rows by task id, debounce search, and update only due chips on the minute tick.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update docs/specs/ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
