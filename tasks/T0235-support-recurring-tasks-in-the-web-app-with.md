---
id: T0235
owner: ~
needs: [T0224]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0235: Support recurring tasks in the web app, with local period math, a rule editor, grace completion, and history

## Goals
Add JS period math for day, week, and month units with intervals and IANA timezones, passing the shared vectors.
Roll recurring tasks over locally in local mode; while connected, apply the display rule until the server rolls over.
Edit unit, interval, end date, end count, and timezone, and offer grace completion for the previous period.
Add a history view of events and occurrences, online from the server and local in local mode.
Start after T0224, todos.server T0221, and todos.server T0219, which authors `docs/specs/recurrence-test-vectors.json`.
Follow the [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the T0215 spec, the shared recurrence vectors, the T0224 occurrence fold, and the editor code.
- [x] **[Decided]**   Local mode keeps recurring tasks with local period math and roll-over, decided on 2026-11-13.
- [ ] **[Implement]** Author periods tests over the shared vectors and roll-over, display rule, and grace unit tests.
- [ ] **[Implement]** Author e2e tests that set a weekly recurrence locally, tick it, and roll it over.
- [ ] **[Verify]**    Run the unit and e2e suites and capture the expected red-phase failures.
- [ ] **[Implement]** Add periods.js and local roll-over with missed periods and recurrence ends.
- [ ] **[Implement]** Add the recurrence editor, the display rule, and the grace completion menu item.
- [ ] **[Implement]** Add the history view over the events and occurrences routes and local stores.
- [ ] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [ ] **[Visual]**    Capture before and after screenshots of the editor, a recurring row, and the history view.
- [ ] **[Doc]**       Update requirements, local-store.md, ui-design.md, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Wrote the recurrence part of the approved T0224 split, with local period math for local mode.
