---
id: T0232
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
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
- [ ] **[Implement]** Call test.setTimeout(90_000) in both tab-through tests.
- [ ] **[Verify]**    Run the full end-to-end suite twice and record both results.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.
