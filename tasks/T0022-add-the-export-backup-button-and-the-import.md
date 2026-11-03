---
id: T0022
owner: ~
needs: [T0020, T0021]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
---
# T0022: Add the Export backup button and the Import backup dialog with mode choice, counts, and confirmation

## Goals
Enable Export backup in Settings, saving the file at once and confirming with a toast (`BAK-1`).
Enable Import backup with the dialog of docs/specs/ui-design.md and its wireframe import.svg.
Show the file's counts, the Merge or Overwrite choice, and the resulting counts before applying (`BAK-5`, `BAK-11`, `BAK-12`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's backup flows and the import wireframe.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Wire Export backup and write the import dialog on top of the backup module.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

