---
id: T0036
owner: ~
needs: [T0035]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0036: Build the shared task list rows and the add bar for the task screens

## Goals
Build `src/js/views/task-list.js` with row rendering, the status menu, the More menu, and delete with an Undo toast.
Build `src/js/views/add-bar.js`: Enter adds a task and keeps focus, with a counter from 450 characters (`TSK-1`).
Split from T0016 on 2026-11-04 for size; the code was written during T0016.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the code written during T0016 that this split task takes over.
- [ ] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests against the previous stage, confirm they fail, and record the output.
- [ ] **[Implement]** Take over the implementation from the T0016 working tree.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
