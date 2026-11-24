---
id: T0295
owner: "@claude"
session: claude-20261124-224722
needs: []
branch: task/T0295-replace-the-eight-local-make-helpers-with-the
worktree: .plan/work/T0295-replace-the-eight-local-make-helpers-with-the
status: completed
started_at: "2026-11-24T12:44:06Z"
ended_at: "2026-11-24T13:01:25Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 563.1, input: 66, output: 14015, cache_read: 2204232, cache_write: 71305}
  review: {turns: 1, duration_s: 461.6, input: 90912, output: 6564, cache_read: 694777}
review_status: approved
review_round: 1
review_requested_at: "2026-11-24T12:53:38Z"
reviewed_by: "@gemini"
review_session: antigravity-20261124-a1b2c5
work_duration: 1039.2
completion-commit: 132b0584c5035c4b5597d43c23b27cfdb4d0b6b3
---
# T0295: Replace the eight local make helpers with the vendored dom-builders.js

## Goals
Eight modules each define the same `make(doc, tag, className, text)` element helper.
Define `make` once in a new shared module over the `h` builder of the vendored `createDomBuilders(doc)`.
Drop the seven other copies; task-list.js re-exports the shared `make` for its nine importers.
Change no markup or behavior; the existing tests are the safety net.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [x] **[Read]**      Read the vendored dom-builders.js and every local make helper and its callers.
- [x] **[Implement]** Add a unit test proving the chosen builder matches make for class, text, and empty text.
- [x] **[Verify]**    Run it and confirm it fails before the builder exists.
- [x] **[Implement]** Add the shared make over h and replace the eight local helpers with imports of it.
- [x] **[Verify]**    Run the completion check.
- [x] **[Doc]**       Update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.

- [2026-11-24] **[Implement]**
  Added src/js/ui/dom.js with make over h, removed eight local copies, and added the new modules to precache and modulepreload.
  - Empty class still writes class attribute, as before.

- [2026-11-24] **[Verify]**
  Completion check passed: 1801 unit, 276 e2e, and 215 pytest tests.
  - Size note: 10 counted files, as the task file planned.
  - Files touched: 10.
  - Lines touched: 154.
  - Reopenings: 0.

- [2026-11-24] **[Read]**
  Read dom-builders.js and the eight identical make helpers; h skips an empty class and adds a text node for empty text.

- [2026-11-24] **[Verify]**
  Added tests/unit/dom.test.js comparing make with the old helper; it failed because src/js/ui/dom.js did not exist.

- [2026-11-24] **[Doc]**
  Added a FrontEnd bullet under v0.5.1-pre in CHANGELOG.md.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-24] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0295-replace-the-eight-local-make-helpers-with-the/review-findings-1.md).

- [2026-11-24] **[Complete]**
  Task completed successfully.

