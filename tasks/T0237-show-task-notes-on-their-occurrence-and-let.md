---
id: T0237
owner: "@claude"
session: claude-20261115-f0814b
needs: []
branch: task/T0237-show-task-notes-on-their-occurrence-and-let
worktree: .plan/work/T0237-show-task-notes-on-their-occurrence-and-let
status: active
started_at: "2026-11-15T12:45:42Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 2423.4, input: 528, output: 142678, cache_read: 41633182, cache_write: 545794}
  review: {turns: 2, duration_s: 2022.2, input: 666458, output: 88392, cache_read: 14179790}
work_duration: 49931.3
review_status: rejected
review_round: 1
review_requested_at: "2026-11-15T13:04:59Z"
reviewed_by: "@gemini"
review_session: antigravity-20261115-2ddebf
---
# T0237: Show task notes on their occurrence, and let users keep a note global or tie it to an occurrence

## Goals
Show each note of a recurring task on its occurrence in the task history, and global notes on the task.
Let the note editor keep a note global or tie it to an occurrence, for one-off and recurring tasks.
Send and merge the note `occurrence` field, following [Notes and Occurrences](../../../todos.server/docs/specs/business-logic-spec.md#notes-and-occurrences) and [Task Notes](../../../todos.server/docs/specs/rest-api-spec.md#task-notes).
Start after todos.server T0249 adds the link to the REST note routes.

## Task Execution Steps
- [x] **[Read]**      Read the server specs on note links and the web app's note and history views.
- [x] **[Implement]** Author tests for showing linked notes and changing a note's link.
- [x] **[Verify]**    Run the tests and capture the expected failures.
- [x] **[Implement]** Show notes on their occurrence and add the global-or-occurrence choice to the note editor.
- [x] **[Verify]**    Run the tests and check the views in the browser.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-14] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-15] **[Read]**
  Blocked before coding: the web app stores no occurrences or rules and has no task history view.
  - T0224 adds occurrences, current-occurrence, and note field renames.
  - T0235 adds the task history view notes must show on.
  - todos.server T0249 is complete, so the REST side is ready.

- [2026-11-15] **[Decided]**
  Manager unblocked the task: T0224 and T0235 are complete; added technical-spec.md with declared files, tests, and a 13-file, 650-line estimate.

- [2026-11-15] **[Size]**
  Size note: about 20 counted files, 690 lines; files cross the large line through small sync, CSS, and store fix-ups. Manager: keep whole; lines stay under 1000.

- [2026-11-15] **[Implement]**
  Linked notes to occurrences in the store, queue, merge, and adoption, and showed links in the thread, history, and edit form.
  - addNote links by period; editNote changes text, link, or both.
  - Belongs to select offers Whole task, then occurrences newest first.
  - Service worker VERSION bumped to 2026-11-15.14 with regenerated precache hashes.

- [2026-11-15] **[Implement]**
  Touched 8 undeclared files; the counted diff is 21 files and 675 lines, above the large line.
  - src/js/store/db.js, src/js/sync/adopt.js, src/js/sync/merge.js.
  - src/css/app-chrome.css, src/css/views.css, src/service-worker.js.
  - tests/unit/adopt.test.js, tests/unit/merge.test.js.
  - Mechanical command: node scripts/check-sw-version.mjs --update.
  - Size note: link spans store, sync, merge, adoption, and views; no part merges alone.

- [2026-11-15] **[Verify]**
  Unit, lint, precache, contract, and task editor e2e pass; full e2e has one load-flaky shell test.
  - npx vitest run: 1417 passed.
  - Contract suite against fresh todos.server b202516: 11 passed.
  - task-editor.spec.js: 10 passed; shell.spec.js alone: 22 passed.
  - Screenshots in screenshots/, linked from validation-proof.md.

- [2026-11-15] **[Doc]**
  Updated requirements (NOT-6), local-store.md, ui-design.md, and CHANGELOG.md; filed T0238 for the load-flaky shell e2e test.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 21.
  - Lines touched: 675.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-15] **[Review]**
  Round 1 rejected by @gemini: Unit, contract, Playwright, lint, and service-worker checks pass on `f785d8c`.
  - Findings: [review-findings-1.md](T0237-show-task-notes-on-their-occurrence-and-let/review-findings-1.md).

- [2026-11-15] **[Implement]**
  Addressed review round 1: server-matching default links, edit-times in note edits, editable past notes, full link choices, live history notes.
  - Occurrences 1 to current; connected edit forms label them from the server.
  - CHANGELOG consolidated; added doc sentences kept to 20 words.
  - technical-spec.md lists undeclared files and the mechanical command.

- [2026-11-15] **[Verify]**
  Rework verified: unit 1423 passed, lint and precache OK, contract 12 passed, full e2e 210 passed.
  - The new contract case also passes without the push fix; header suffices.
  - Round 2 screenshots: after-r2 captures in screenshots/.

- [2026-11-15] **[Verify]**
  Recorded task outcomes after review round 1.
  - Files touched: 23.
  - Lines touched: 905.
  - Reopenings: 0.
  - Size note: above the large line; human size approval still outstanding.

