---
id: T0020
owner: ~
needs: [T0015, T0014]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
---
# T0020: Build the Recycle bin and Settings screens with theme selection and the local connection card

## Goals
Build the Recycle bin per docs/specs/ui-design.md, with restore and in-row confirmed permanent delete (`BIN-1` to `BIN-4`).
Build Settings with Appearance, Data, Connection with the server URL, and About sections.
Make the theme choice apply at once and persist per device.
Leave the Export, Import, and Connect buttons to their own tasks, shown disabled until then.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's Recycle Bin and Settings sections and their wireframes.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the recycle bin and settings views and the preferences module.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

