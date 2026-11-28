---
id: T0301
owner: "@claude"
session: claude-20261128-582e1b
needs: []
branch: task/T0301-support-the-year-recurrence-unit-in-local-periods
worktree: .plan/work/T0301-support-the-year-recurrence-unit-in-local-periods
status: active
started_at: "2026-11-28T01:54:47Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0301: Support the year recurrence unit in local periods, with the year cases of the shared recurrence vectors

## Goals
Support the `year` recurrence unit in src/js/core/periods.js, per ADR-0006 of todos.server.
Years start on 1 January in the rule's timezone.
Copy the year cases into tests/fixtures/recurrence-test-vectors.json once todos.server task T0298 adds them.

## Task Execution Steps
- [x] **[Read]**      Read periods.js, its tests, and the year cases in the todos.server recurrence vectors.
- [x] **[Implement]** Copy the shared vectors with the year cases into the fixture, so the tests fail.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Add the year unit to periods.js.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Verify]**
  Year vectors fail before and pass after; 1879 unit tests pass.
  - Files touched: 4.
  - Lines touched: 105.
  - Reopenings: 0.

- [2026-11-28] **[Read]**
  Read periods.js, its tests, and the todos.server year vectors.

- [2026-11-28] **[Implement]**
  Copied 12 year vectors into the fixture and raised the vector count check.

- [2026-11-28] **[Verify]**
  Confirmed 12 year vectors fail with a RangeError for the unknown unit.

- [2026-11-28] **[Implement]**
  Added the year unit to periods.js and a Yearly label in occurrences.js.

- [2026-11-28] **[Doc]**
  Added the CHANGELOG entry; no other docs name the unit list.

