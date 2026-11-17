---
task: T0266
round: 2
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-17T23:03:08Z
reviewed_commit: "f02e392"
base_commit: "c72b266"
branch: task/T0266-sync-the-view-options-of-all-tasks-and
session: claude-20261118-9a0adf
session_agent: claude-code
session_created_at: 2026-11-17T23:01:48Z
---
# Review Findings: Task T0266 (Round 2)

## Summary
Commit `f02e392` resolves all round 1 Required Rework, and the round 1 process gaps as well.
- Rework 1: `allListIds` in `src/js/sync/engine.js:26` combines `listLists()` with the `list` entries of `listBin()`.
  - `listBin` returns `{type: 'list', id}` entries for deleted lists (`src/js/store/bin.js:313`).
  - Binned lists keep their view options; only purged lists are pruned.
- Rework 2: a new test in `tests/unit/settings-sync.test.js` goes through the engine's default settings wiring.
  - Binned keeps the value locally and on the service; purged removes it and sends `null`.
  - validation-proof.md records the test failing before the fix.
- Rework 3: validation-proof.md records reruns of unit, lint, service worker check, full e2e, and contract suites.
- Round 1 gaps fixed too:
  - The Settings switch listener now stops in `destroy()`; the app calls it on screen change (`src/js/app.js:252`); a unit test covers it.
  - The e2e asserts a mocked `304`.
  - The TV-12 test block was renamed.

Reviewer reruns on `f02e392`:
- `npm test`: 67 files, 1785 passed.
- `npx eslint .`: exit 0.
- `node scripts/check-sw-version.mjs`: OK, 143 files match `2026-11-17.41`.
- `npx playwright test tests/e2e/settings-sync.spec.js`: 1 passed.
- Contract suite: not rerun, since it needs a scratch todos.server build with T0262. Recorded evidence accepted.

The rework introduced no defects.

## Defects
None.

## Process Gaps
None.

## Required Rework
None.
