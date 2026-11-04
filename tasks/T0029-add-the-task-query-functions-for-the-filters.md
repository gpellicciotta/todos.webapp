---
id: T0029
owner: ~
needs: [T0013]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0029: Add the task query functions for the filters, search, and sorting of All tasks and the list view

## Goals
Add pure query functions for the filters, search, and sorts of All tasks and the list view (`TV-2` to `TV-10`, `LV-6`).
Split from T0013 on 2026-11-04 to keep both tasks below the large size line.
The code exists on branch wip/T0013-ordering; it is reviewed and integrated here.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' Task View section and the parked query module on wip/T0013-ordering.
- [ ] **[Implement]** Take over the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests without query.js, confirm they fail, and record the output in validation-proof.md.
- [ ] **[Implement]** Take over query.js from the parked branch on top of the integrated T0013 ordering.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Describe the query module in docs/specs/local-store.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
