---
id: T0229
owner: "@claude"
session: claude-20261115-121929
needs: []
branch: task/T0229-parse-due-dates-times-and-list-tags-typed
worktree: .plan/work/T0229-parse-due-dates-times-and-list-tags-typed
status: active
started_at: "2026-11-15T01:27:48Z"
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
- [x] **[Read]**      Read the add bar, task creation, list find, and permission code.
- [x] **[Decide]**    Decide the escape syntax for literal tokens and how unknown list tags behave.
- [x] **[Implement]** Author failing unit tests for the parser and an e2e test for adding with syntax.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the parser, the preview line, and the add bar integration.
- [x] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [x] **[Visual]**    Inspect the preview line at 390 px and 1440 px, in both themes.
- [x] **[Doc]**       Add the syntax to the requirements, the Search and Add design, About, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.

- [2026-11-15] **[Decided]**
  A backslash before a token keeps it literal and is dropped; unknown or read-only #tags stay in the description, and the preview names no list.
  - Tags match folded names ignoring spaces, dashes, and underscores.
  - Full weekday names only, so words like sun stay text.
  - The first date and first time win; later ones stay text.
  - Text with nothing left after parsing adds literally.

- [2026-11-15] **[Verify]**
  New unit and e2e tests fail for the right reasons: missing parser module, missing setLists, unparsed descriptions, and no preview element.

- [2026-11-15] **[Implement]**
  Added the quick-add parser, the add bar preview line, parsed adds in All tasks and list views, and the About syntax line.
  - Registered quick-add.js for preload and precache, bumping the worker VERSION.

- [2026-11-15] **[Verify]**
  Unit suite, lint, worker version check, and the all-tasks e2e spec pass; one shell e2e test failed once under full parallel load and passed on rerun.

- [2026-11-15] **[Visual]**
  Inspected the preview line at 390 and 1440 px in light and dark; before and after captures are linked in validation-proof.md, with no console errors.

- [2026-11-15] **[Doc]**
  Added TSK-14 to the requirements, the syntax to Search and Add, a syntax line to About, and a CHANGELOG bullet.

- [2026-11-15] **[Verify]**
  Size note: 13 counted files and 276 lines exceed the typical line; both views, the preload list, and the worker list must change for one mergeable feature.
  - Files touched: 13.
  - Lines touched: 276.
  - Reopenings: 0.

