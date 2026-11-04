---
id: T0037
owner: ~
needs: [T0036]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0037: Build the task view controls: search, filter chips with popovers, the sort menu, and per-device preferences

## Goals
Build `src/js/views/view-controls.js`: search, Lists, Status, Due, and Created filter chips, Sort, and Clear all (`TV-2` to `TV-9`).
Build `src/js/core/preferences.js` with safe per-device reads and writes, reused by the Settings screen (`TV-12`).
Split from T0016 on 2026-11-04 for size; the code was written during T0016.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the code written during T0016 that this split task takes over.
- [x] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [x] **[Verify]**    Run the tests against the previous stage, confirm they fail, and record the output.
- [x] **[Implement]** Take over the implementation from the T0016 working tree.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Implement]**
  Took over view-controls.js, core/preferences.js, and their unit tests from T0016 as split stage 3, precached under VERSION 2026-11-04.5.
  - Snapshot: scratchpad t0016-split/3-T0037.

- [2026-11-04] **[Verify]**
  Recorded red against stage 2 and green at stage 3 in fresh trees; tests, lint, service worker check, and end-to-end pass.
  - Files touched: 5.
  - Lines touched: 791, under three times the 780 estimate.
  - Reopenings: 0.

