---
id: T0041
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
# T0041: Fix the open minor review findings in the screens and editors: focus, ARIA, dialogs, saves, drag, and test timing

## Goals
Fix the minor findings that earlier agent reviews recorded for T0016 to T0020 and their split tasks.
They cover focus and ARIA details, dialog cleanup, double saves, drag edge cases, and a slow e2e test.
Split from T0038 on 2026-11-04, so the performance work stays a separate task.
See technical-spec.md for the findings, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the listed findings and the affected view, editor, and test modules.
- [ ] **[Implement]** Write failing regression tests for each finding listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Fix each finding with the smallest change that makes its test pass.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update docs/specs/ui-design.md where behavior changes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
