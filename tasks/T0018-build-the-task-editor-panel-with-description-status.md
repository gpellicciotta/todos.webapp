---
id: T0018
owner: ~
needs: [T0016]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0018: Build the task editor panel with description, status, due time, overdue behavior, lists, notes, and delete

## Goals
Build the task editor per docs/specs/ui-design.md and its wireframe task-editor.svg.
Open it as the right panel in wide layouts and as a full screen in compact layouts.
Save every field on change, with field errors for invalid values (`TSK-1` to `TSK-12`).
Add the notes thread with the add note field on top, newest first (`NOT-1` to `NOT-5`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's Task Editor section and the task editor wireframe.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the editor panel, the task editor, and the notes thread.
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

