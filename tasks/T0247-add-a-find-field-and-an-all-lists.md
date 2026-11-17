---
id: T0247
owner: "@claude"
needs: []
branch: task/T0247-add-a-find-field-and-an-all-lists
worktree: .plan/work/T0247-add-a-find-field-and-an-all-lists
status: active
started_at: "2026-11-17T01:53:53Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0247: Add a find field and an All, Lists, Tasks choice to the Recycle Bin to filter its entries

## Goals
Make entries easy to find in a full Recycle Bin, before restoring or deleting them.
- A find field filters entries by list name or task description as the user types.
- An All, Lists, Tasks choice narrows the entries by type.
- An info line counts the matches and offers Reset.
- Empty recycle bin keeps covering the whole bin; T0248 adds actions on the matches.
- Rules and tests: [technical-spec.md](T0247-add-a-find-field-and-an-all-lists/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read recycle-bin.js, list-find.js, and the Many Lists find rules in the UI design.
- [ ] **[Doc]**       Add BIN-8, the Recycle Bin design rules, and the wireframe change.
- [ ] **[Implement]** Author failing unit tests for matching, the type choice, the info line, and Reset.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the find field, the type choice, the info line, and the no-match text.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Capture the filtered bin in light and dark themes, at desktop and phone widths.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request for a Recycle Bin filter.
