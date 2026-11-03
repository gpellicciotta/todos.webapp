---
id: T0028
owner: ~
needs: [T0019, T0026]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
---
# T0028: Add the Sharing section to the list editor, role-aware controls, and the Shared filter

## Goals
Build the list editor's Sharing section per docs/specs/ui-design.md: invite, change role, remove (`SHR-1` to `SHR-3`).
Disable sharing controls while offline with a banner (`SHR-6`).
Offer only the actions the user's role allows on every screen (`SHR-4`, `SHR-5`).
Add the Shared filter to All tasks while connected (`TV-7`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' Sharing section, the service's permission table, and the list editor wireframe.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the permissions module and the Sharing section, and hide disallowed actions.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

