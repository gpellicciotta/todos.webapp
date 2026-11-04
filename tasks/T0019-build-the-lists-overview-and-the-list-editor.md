---
id: T0019
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T20:44:38Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0019: Build the Lists overview and the list editor panel with name, description, details, and delete

## Goals
Build the Lists overview and the list editor per docs/specs/ui-design.md and its wireframes.
Open the list editor in the editor panel, saving name and description on change (`LST-1` to `LST-5`).
Create a new list once its name is valid; delete a list after confirmation (`LST-6`, `LST-7`).
Show the Sharing section's local-mode text: Connect to share this list.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's Lists Overview and List Editor sections and their wireframes.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the Lists overview and the list editor in the editor panel.
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

