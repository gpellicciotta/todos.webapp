---
id: T0041
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T21:59:03Z"
ended_at: "2026-11-04T22:20:52Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 46ff7c15513be1824fcfb24afc68b86077b81a21
---
# T0041: Fix the open minor review findings in the screens and editors: focus, ARIA, dialogs, saves, drag, and test timing

## Goals
Fix the minor findings that earlier agent reviews recorded for T0016 to T0020 and their split tasks.
They cover focus and ARIA details, dialog cleanup, double saves, drag edge cases, and a slow e2e test.
Split from T0038 on 2026-11-04, so the performance work stays a separate task.
See technical-spec.md for the findings, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the listed findings and the affected view, editor, and test modules.
- [x] **[Implement]** Write failing regression tests for each finding listed in technical-spec.md.
- [x] **[Verify]**    Run the tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Fix each finding with the smallest change that makes its test pass.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update docs/specs/ui-design.md where behavior changes, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Implement]**
  Fixed 18 findings with regression tests in a clean main extract; the compact delete path was already fixed by the editor's Delete task.
  - Chips use data-active beside aria-expanded, not aria-pressed.
  - Service worker VERSION bumped to 2026-11-04.19.

- [2026-11-04] **[Verify]**
  Red phase failed 21 new tests; afterwards unit, lint, check:sw, 113 e2e, and perf passed; validation-proof.md records the output.
  - Focus-ring e2e test: 8.6 s to 5.4 s alone.
  - Visual-free: no visible change, so no screenshots.

- [2026-11-04] **[Verify]**
  Size note: the diff crossed the typical line; the chip attribute change spans CSS, gallery, specs, and docs.
  - Files touched: 33.
  - Lines touched: 597.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Agent review approved all fixes after checking that each has a failing-first test; one nit on a default navigate fallback.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

