---
id: T0016
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T16:27:05Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0016: Build the All tasks screen with search, filters, sort, the add bar, the status menu, and the empty state

## Goals
Build All tasks per docs/specs/ui-design.md and its wireframes all-tasks.svg and first-launch.svg.
Add search, the Lists, Status, Due, and Created filters, and the sort menu (`TV-1` to `TV-12`).
Add the add bar and the status menu on each row (`TSK-1`, `TSK-4`).
Show the first-launch empty state and ask for persistent storage after the first task (`LOC-1`, `TEC-5`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's All Tasks screen, Task Row, Add Bar, and View Controls sections.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the All tasks view, the shared task list and controls, and the add bar.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

