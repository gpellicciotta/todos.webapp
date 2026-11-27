---
id: T0301
owner: ~
needs: []
branch: —
worktree: —
status: suspended
started_at: —
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
- [ ] **[Read]**      Read periods.js, its tests, and the year cases in the todos.server recurrence vectors.
- [ ] **[Implement]** Copy the shared vectors with the year cases into the fixture, so the tests fail.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the year unit to periods.js.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
