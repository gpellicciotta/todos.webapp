---
id: T0302
owner: "@claude"
session: claude-20261128-833341
needs: []
branch: task/T0302-port-the-adr-0006-fold-to-the-local
worktree: .plan/work/T0302-port-the-adr-0006-fold-to-the-local
status: active
started_at: "2026-11-28T00:14:02Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0302: Port the ADR-0006 fold to the local occurrences module, passing the shared fold test vectors

## Goals
Port the ADR-0006 fold of todos.server to src/js/core/occurrences.js, as local-store.md specifies after T0299.
Fold goals, checked and timed `log` entries, amounts, readings, retroactive `undo-log`, status from progress, and verdicts.
Carry readings across occurrences, and keep folding stored `complete` and `uncomplete` in place until the store upgrade converts them.
Copy docs/specs/fold-test-vectors.json from todos.server task T0293 into tests/fixtures, and pass every case.

## Task Execution Steps
- [x] **[Read]**      Read the fold rules, the shared fold vectors, and occurrences.js.
- [x] **[Implement]** Add the vectors fixture, a vectors test, and focused fold tests, all failing.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Port the fold, verdicts, and carried readings to occurrences.js.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Implement]**
  Added the fold vectors fixture and tests (failed: functions missing), then foldLog and foldInPlace in occurrences.js; 1830 tests and lint pass; docs and changelog updated.

- [2026-11-28] **[Read]**
  Read the server fold spec, LogFold.java, TaskOccurrence.fold, the vectors, and occurrences.js.

- [2026-11-28] **[Verify]**
  New tests failed with foldLog and foldInPlace not being functions.

- [2026-11-28] **[Verify]**
  Occurrences tests pass 38 of 38, the full suite passes 1830 of 1830, and eslint is clean.

- [2026-11-28] **[Doc]**
  Updated local-store.md Fold section and CHANGELOG.md.

