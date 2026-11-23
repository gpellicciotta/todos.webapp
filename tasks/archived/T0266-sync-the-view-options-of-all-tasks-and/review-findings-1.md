---
task: T0266
round: 1
verdict: rejected
blocking: 1
reviewer: "@claude"
reviewed_at: 2026-11-17T22:54:38Z
reviewed_commit: "b1848c0"
base_commit: "c72b266"
branch: task/T0266-sync-the-view-options-of-all-tasks-and
session: claude-20261117-361149
session_agent: claude-code
session_created_at: 2026-11-17T22:48:18Z
---
# Review Findings: Task T0266 (Round 1)

## Summary
The settings sync is mostly sound and well tested.
It covers edit times, merge by edit time, the pending queue, `ETag`/`304`, refresh, disconnect, and local mode.
Reviewer reruns on `b1848c0`:
- `npm test`: 67 files, 1783 passed.
- `npx eslint .`: exit 0.
- `node scripts/check-sw-version.mjs`: OK, 143 files match `2026-11-17.40`.
- `npx playwright test`: 274 passed (3.4m), including `settings-sync.spec.js`.
- Contract suite: not rerun; it needs a todos.server build with T0262. The recorded evidence was accepted.

One blocking defect: pruning drops the view options of lists in the recycle bin, not only of purged lists.

## Defects
1. **Blocking: binning a list erases its view options on every device.**
   - `src/js/sync/engine.js:52` passes `store.listLists()` as `listIds`.
   - `listLists` leaves out recycle bin lists (`src/js/store/lists.js:152-160`).
   - The `listIds` contract in `src/js/sync/settings.js:421` says trashed lists count.
   - The spec prunes only "after a list is permanently deleted".
   - Effect: the next settings run removes `todos.view.list.{{list-id}}` for a binned list and uploads `null`.
   - Undo or Restore brings the list back with default view options. Other devices lose them as well.
   - Reproduced with a scratch script that uses the engine's default `listIds`:
     ```text
     run 1: uploaded stored: true
     binned; in listBin: true
     run 2: uploaded stored: false
     PATCH after binning: {"todos.view.list.01a1a5c9-...":null}
     restored; view options stored: false
     ```
   - The prune unit test passes its own `listIds`, so it misses the engine's default wiring.

## Process Gaps
- Non-blocking: the Make Enter add listener in `src/js/views/settings.js:272` stops only on the next settings change after the screen closes. Closed screens keep their listeners until then.
- Non-blocking: the e2e `304` step checks only that a `GET` sent `If-None-Match`, not that the mock answered `304`.
- Non-blocking: `tests/unit/view-controls.test.js` still names its block "view state per device (TV-12)".

## Required Rework
1. Prune only lists that left the store for good: pass every list ID the store holds, recycle bin included, from the engine.
   For example, combine `listLists()` with the lists of `listBin()`, or add a store read of all list IDs.
2. Add a unit test that goes through the engine's default settings wiring. A binned list keeps its view options. A purged list sends `null`.
3. Rerun `npm test` and the settings sync e2e spec, and record the output in validation-proof.md.
