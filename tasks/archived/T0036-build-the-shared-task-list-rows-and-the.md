---
id: T0036
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T17:55:22Z"
ended_at: "2026-11-04T19:04:48Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@claude-review-agent"
completion-commit: 7b1f3803182e8acb63030f9fd9293385e001a845
---
# T0036: Build the shared task list rows and the add bar for the task screens

## Goals
Build `src/js/views/task-list.js` with row rendering, the status menu, the More menu, and delete with an Undo toast.
Build `src/js/views/add-bar.js`: Enter adds a task and keeps focus, with a counter from 450 characters (`TSK-1`).
Split from T0016 on 2026-11-04 for size; the code was written during T0016.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the code written during T0016 that this split task takes over.
- [x] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [x] **[Verify]**    Run the tests against the previous stage, confirm they fail, and record the output.
- [x] **[Implement]** Take over the implementation from the T0016 working tree.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Implement]**
  Took over task-list.js, add-bar.js, and their unit tests from T0016 as split stage 2, precached under VERSION 2026-11-04.4.
  - Snapshot: scratchpad t0016-split/2-T0036.

- [2026-11-04] **[Verify]**
  Recorded red against stage 1 and green at stage 2 in fresh trees; tests, lint, service worker check, and end-to-end pass.
  - Files touched: 6.
  - Lines touched: 723, under three times the 710 estimate.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 rejected by @claude-review-agent: Re-render closes an open status or More menu and drops focus to body; deleting the last row also loses focus.

- [2026-11-04] **[Implement]**
  Review rework: rendering keeps an open row menu open on the same item, keeps row focus, and falls back when the last row leaves.
  - Stage 2 VERSION is now 2026-11-04.7.
  - Lines touched: 833 in 6 files, under three times 710.

- [2026-11-04] **[Review]**
  Round 1 rejected for menu and focus loss on re-render; round 2 approved, one empty-menu edge went to T0038.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 7.
  - Lines touched: 840.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 2 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

