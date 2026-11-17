---
id: T0247
owner: "@claude"
session: claude-20261117-02f07b
needs: []
branch: task/T0247-add-a-find-field-and-an-all-lists
worktree: .plan/work/T0247-add-a-find-field-and-an-all-lists
status: completed
started_at: "2026-11-17T01:53:53Z"
ended_at: "2026-11-17T02:18:01Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 1287.1, input: 104, output: 28273, cache_read: 5935179, cache_write: 113525}
  review: {turns: 1, duration_s: 147.2, input: 44659, output: 2386, cache_read: 394368, cache_write: 0}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T02:15:30Z"
reviewed_by: "@codex"
review_session: codex-20261117-fe944a
work_duration: 1447.8
completion-commit: 713c5adbef441a300351ec375244fb2edebd18b7
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
- [x] **[Review]**    Obtain review approval of the finished work before completion.

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

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @codex: [Decided]** Approved with non-blocking wording and evidence gaps.
  - Findings: [review-findings-1.md](T0247-add-a-find-field-and-an-all-lists/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

## Screenshots
- Before: [bin-before-light-desktop.png](T0247-add-a-find-field-and-an-all-lists/bin-before-light-desktop.png)
- After light desktop: [bin-after-light-desktop.png](T0247-add-a-find-field-and-an-all-lists/bin-after-light-desktop.png)
- After dark desktop: [bin-after-dark-desktop.png](T0247-add-a-find-field-and-an-all-lists/bin-after-dark-desktop.png)
- After light phone: [bin-after-light-phone.png](T0247-add-a-find-field-and-an-all-lists/bin-after-light-phone.png)
- After dark phone: [bin-after-dark-phone.png](T0247-add-a-find-field-and-an-all-lists/bin-after-dark-phone.png)
