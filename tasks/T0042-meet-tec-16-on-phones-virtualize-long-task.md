---
id: T0042
owner: ~
needs: [T0038]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0042: Meet TEC-16 on phones: virtualize long task lists and verify 200 ms first paint under 4x CPU throttling

## Goals
Meet `TEC-16`: views open within 200 ms with 5000 tasks on a mid-range phone.
After T0038, the first 60 rows paint in about 250 ms on desktop, an estimated 0.8 to 1.2 s on a phone.
Virtualize long task lists, so only visible rows plus a buffer exist in the DOM.
Keep find-in-page, screen reader counts, keyboard moves, and drag ranges correct for rows not rendered.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the T0038 review numbers and the progressive task list rendering.
- [ ] **[Implement]** Write a performance test that throttles the CPU four times and asserts a 200 ms first paint.
- [ ] **[Verify]**    Run the test on the current build, confirm it fails, and record the output in validation-proof.md.
- [ ] **[Implement]** Render only the visible rows plus a buffer, keeping focus, menus, drag, and moves working.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update docs/specs/ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
