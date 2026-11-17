---
id: T0247
owner: "@claude"
session: claude-20261117-02f07b
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
- [x] **[Read]**      Read recycle-bin.js, list-find.js, and the Many Lists find rules in the UI design.
- [x] **[Doc]**       Add BIN-8, the Recycle Bin design rules, and the wireframe change.
- [x] **[Implement]** Author failing unit tests for matching, the type choice, the info line, and Reset.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the find field, the type choice, the info line, and the no-match text.
- [x] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [x] **[Visual]**    Capture the filtered bin in light and dark themes, at desktop and phone widths.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request for a Recycle Bin filter.

- [2026-11-17] **[Verify]**
  Recorded verification in validation-proof.md.
  - Unit 1542 passed.
  - E2E and lint passed.

- [2026-11-17] **[Doc]**
  Moved the shell shortcut spec to Settings; bumped service worker VERSION to 2026-11-17.7.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 420.
  - Reopenings: 0.

- [2026-11-17] **[Implement]**
  Added find field, type choice, info line, Reset, and no-match text to recycle-bin.js.

- [2026-11-17] **[Visual]**
  Captured filtered bin in light and dark, desktop and phone; fixed the stacked type choice.

- [2026-11-17] **[Doc]**
  Added BIN-8, UI design rules, regenerated the recycle-bin wireframe, and updated the changelog.


## Screenshots
- Before: [bin-before-light-desktop.png](T0247-add-a-find-field-and-an-all-lists/bin-before-light-desktop.png)
- After light desktop: [bin-after-light-desktop.png](T0247-add-a-find-field-and-an-all-lists/bin-after-light-desktop.png)
- After dark desktop: [bin-after-dark-desktop.png](T0247-add-a-find-field-and-an-all-lists/bin-after-dark-desktop.png)
- After light phone: [bin-after-light-phone.png](T0247-add-a-find-field-and-an-all-lists/bin-after-light-phone.png)
- After dark phone: [bin-after-dark-phone.png](T0247-add-a-find-field-and-an-all-lists/bin-after-dark-phone.png)
