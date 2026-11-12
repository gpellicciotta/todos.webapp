---
id: T0229
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
# T0229: Parse due dates, times, and list tags typed in the add field into the new task

## Goals
Let users set a due time and lists while typing a task, such as `Buy paint tomorrow 18:00 #home`.
- A pure parser recognizes dates, times, and `#list` tags in the added text.
- Recognized tokens leave the description and set the due time and list memberships.
- A preview line under the field shows what the add will set, before the user adds.
- The parser works offline and in US English only (`TEC-12`).
- Motivation: [comparing-with-google-products.md](https://github.com/gpellicciotta/todos.server/blob/main/docs/comparing-with-google-products.md), section Improvement Plan, item Fast capture.

Completion check: `npm run test:unit` and the all-tasks e2e spec pass.
Size estimate: 6 files, 250 lines.

## Task Execution Steps
- [ ] **[Read]**      Read the add bar, task creation, list find, and permission code.
- [ ] **[Decide]**    Decide the escape syntax for literal tokens and how unknown list tags behave.
- [ ] **[Implement]** Author failing unit tests for the parser and an e2e test for adding with syntax.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the parser, the preview line, and the add bar integration.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Inspect the preview line at 390 px and 1440 px, in both themes.
- [ ] **[Doc]**       Add the syntax to the requirements, the Search and Add design, About, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.
