---
id: T0232
owner: "@claude"
session: claude-20261113-f82647
needs: []
branch: task/T0232-give-the-two-gallery-focus-ring-tab-through
worktree: .plan/work/T0232-give-the-two-gallery-focus-ring-tab-through
status: active
started_at: "2026-11-13T14:22:10Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0232: Give the two gallery focus ring tab-through tests a longer timeout, since full parallel runs can exceed 30 seconds

## Goals
Give the two gallery focus ring tab-through tests a longer timeout, since full parallel runs can exceed 30 seconds.
They are `tests/e2e/gallery-app.spec.js:212` and `tests/e2e/gallery-chrome.spec.js:257`; both timed out once during T0230.
Alone, each takes 11 to 28 seconds; four parallel workers pushed one to 28.1 seconds.
Completion check: `npm run test:e2e` passes twice in a row.
### Declared Files
- tests/e2e/gallery-app.spec.js
- tests/e2e/gallery-chrome.spec.js
Size estimate: 2 files, 4 lines

## Task Execution Steps
- [x] **[Implement]** Call test.setTimeout(90_000) in both tab-through tests.
- [x] **[Verify]**    Run the full end-to-end suite twice and record both results.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Implement]**
  Added test.setTimeout(90_000) to both tab-through tests; a failing-test-first step does not apply to a timeout change.

- [2026-11-13] **[Verify]**
  Ran npm run test:e2e twice in a row; both passed with 4 workers.
  - Run 1: 201 passed in 2.8m.
  - Run 2: 201 passed in 2.7m.
  - gallery-controls.spec.js tab-through test reached 21.3s, outside scope.

- [2026-11-13] **[Doc]**
  Added a DevOps bullet under v0.4.1-pre in CHANGELOG.md.

- [2026-11-13] **[Verify]**
  Recorded task outcomes.
  - Files touched: 2.
  - Lines touched: 2.
  - Reopenings: 0.

