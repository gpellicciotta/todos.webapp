---
task: T0028
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-07T22:18:54Z
reviewed_commit: "1857838"
base_commit: "1857838"
branch: task/T0028-add-the-sharing-section-to-the-list-editor
---
# Review Findings: Task T0028 (Round 1)

## Summary
Rejected. The worktree is stuck mid-rebase onto `1857838` with unresolved conflict markers in four files (`src/css/views.css`, `src/index.html`, `src/service-worker.js`, and `scripts/sw-precache-hashes.json`), and the Shared filter in `src/js/views/all-tasks.js` fails to treat lists shared *with* the user as shared when `list.sharing` is empty.

## Defects
1. **Unresolved Git rebase and merge conflict markers in the worktree**:
   - The worktree is in a detached `HEAD` state (`rebasing task/T0028-add-the-sharing-section-to-the-list-editor` onto `1857838`) with unmerged paths and literal `<<<<<<< HEAD` / `=======` / `>>>>>>> 898ff07` conflict markers in:
     - `src/css/views.css`
     - `src/index.html`
     - `src/service-worker.js`
     - `scripts/sw-precache-hashes.json`
   - As a result, `git log main..HEAD` is empty and the source files in the working tree are broken.

2. **Shared filter in All tasks misses lists shared with the user (`src/js/views/all-tasks.js` line 84)**:
   - `readData` computes `sharedListIds` as:
     ```js
     sharedListIds: new Set(lists.filter((list) => list.sharing?.length > 0).map((list) => list.id)),
     ```
   - For a list owned by another user and shared *with* the current user (`list.role` is `'viewer'`, `'task-editor'`, or `'editor'`), the service only populates `sharing` rules for the list owner (or `sharing` is `[]` for non-owners, as in `tests/e2e/sharing.spec.js` line 128).
   - Compare with `sharingText(list)` in `src/js/views/lists.js` (lines 58–64), which checks `(list.role && list.role !== 'owner') || list.sharing?.length > 0`.
   - Because `sharedListIds` only checks `list.sharing?.length > 0`, tasks in lists shared *with* the user are wrongly excluded by `Shared` (`filter.shared === true`) and wrongly included by `Not shared` (`filter.shared === false`).

## Process Gaps
- Companion directory `.plan/tasks/T0028-add-the-sharing-section-to-the-list-editor/` still contains temporary Playwright capture configuration files (`shots.config.mjs` and `shots.spec.mjs`); verify whether temporary scripts should be cleaned up or kept per project conventions.

## Required Rework
1. Complete the rebase of `task/T0028-add-the-sharing-section-to-the-list-editor` onto `main` (`1857838`), resolving all conflicts in `src/css/views.css`, `src/index.html`, `src/service-worker.js`, and regenerating `scripts/sw-precache-hashes.json` via `node scripts/check-sw-version.mjs --update` with a bumped service worker `VERSION`.
2. In `src/js/views/all-tasks.js`, include lists where `(list.role && list.role !== 'owner') || list.sharing?.length > 0` in `sharedListIds`, and add unit/integration test coverage for a list shared *with* the user (`role !== 'owner'`, `sharing: []`) under the `Shared` / `Not shared` filter.
3. Re-run `npm test && npm run lint && npm run check:sw && npm run test:e2e` and update `validation-proof.md` with the fresh green-phase output.

