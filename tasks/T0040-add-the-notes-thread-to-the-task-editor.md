---
id: T0040
owner: ~
needs: [T0018]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0040: Add the notes thread to the task editor: add field on top, newest first, edit and delete own notes

## Goals
Add the task editor's Notes section: the add note field on top, then notes newest first (`NOT-1` to `NOT-5`).
Each note shows its time and an "edited" mark; own notes have Edit and Delete with an in-place confirmation.
Escape in a note's edit field cancels only that edit; a typed new note is kept as a session draft.
Split from T0018 on 2026-11-04 for size; the code was written during T0018.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the notes thread code written during T0018 and its tests.
- [ ] **[Implement]** Take over the failing notes tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests against the editor without notes, confirm they fail, and record the output.
- [ ] **[Implement]** Take over notes.js and wire the thread into the task editor.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update docs/specs/ui-design.md if needed and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
