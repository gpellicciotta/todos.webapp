---
id: T0298
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
# T0298: Make the due text unit tests independent of the locale clock format so the Pages workflow passes on CI

## Goals
The Pages workflow unit tests fail on every push since 2026-11-17, so the site has not deployed since 18fb988.
CI formats times as "10:00 AM"; four due text tests in `task-list.test.js` and `all-tasks.test.js` expect "10:00".
Derive expected clock texts with the code's `Intl` options, or pin the test locale; the app keeps the user's locale.
Completion check: `npx vitest run` passes with a 12-hour locale, and the next Pages run succeeds.

### Declared Files
- tests/unit/task-list.test.js
- tests/unit/all-tasks.test.js

### Tests
- Unit: the four tests pass with a 24-hour and a 12-hour default locale.
- Integration test: none (the Pages workflow run on GitHub is the end-to-end check).

Size estimate: 2 files, 40 lines

## Task Execution Steps
- [ ] **[Verify]**    Reproduce the four failures locally with a 12-hour default locale.
- [ ] **[Implement]** Make the expected due texts follow the locale clock format.
- [ ] **[Verify]**    Run the unit tests with a 24-hour and a 12-hour locale.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.
