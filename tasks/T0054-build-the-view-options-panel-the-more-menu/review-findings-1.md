---
task: T0054
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-07T13:24:20Z
reviewed_commit: "6235efd"
base_commit: "6235efd"
branch: task/T0054-build-the-view-options-panel-the-more-menu
---
# Review Findings: Task T0054 (Round 1)

## Summary
The View options panel, More menu entries, info line, and unit/E2E test coverage in commit `fb4f38d` are well-implemented and satisfy the functional requirements (`VO-1`, `VO-2`, `VO-4` to `VO-8`, `VO-13`, `LV-6` to `LV-8`, `TV-12`). However, the worktree is stopped in the middle of an unfinished interactive rebase onto `main` (`6235efd`, which integrated T0046), leaving unresolved Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in three tracked files and breaking `npx eslint .` and `npm test`. In addition, the compact View options screenshot shows the sticky `.view-options__done` ("Show 4 tasks") button overlapping the Sort by direction segmented control at the bottom of the panel.

## Defects
1. **Unfinished rebase and unresolved merge conflict markers in the worktree**:
   - The working directory is mid-rebase (`interactive rebase in progress; onto 6235efd`) with unmerged paths in `CHANGELOG.md`, `src/service-worker.js`, and `scripts/sw-precache-hashes.json`.
   - `npx eslint .` fails with `src/service-worker.js:12:1 error Parsing error: Unexpected token <<`.
   - `npm test` fails across all 16 tests in `tests/unit/service-worker.test.js` (`SyntaxError: Unexpected token '<<'`) and `tests/unit/precache.test.js`.
2. **Compact View options `.view-options__done` button overlaps the Sort direction control**:
   - In `after-all-tasks-view-options-compact.png`, when a filter accordion row (such as `Status`) is expanded on a 390×844 compact viewport, the sticky `.view-options__done` ("Show 4 tasks") button at `inset-block-end: var(--space-2)` sits directly on top of the "Ascending / Descending" `.view-options__direction` segmented control, clipping its bottom half.
   - `.view-options` or `.view-options__done` needs bottom spacing or a sticky footer treatment so that the last form control is never obscured behind the sticky Show button when content reaches the bottom edge.

## Process Gaps
- **Undeclared files not listed in `technical-spec.md`**:
  - Commit `fb4f38d` modifies 21 files, including 9 files not listed under `### Declared Files` in `technical-spec.md`: `CHANGELOG.md`, `docs/specs/ui-design.md`, `docs/specs/visual-style-guide.md`, `scripts/sw-precache-hashes.json`, `src/service-worker.js`, `tests/e2e/gallery-app.spec.js`, `tests/unit/all-tasks.test.js`, `tests/unit/list.test.js`, and `tests/unit/router.test.js`. Per `plan-task-usage-guidelines`, every counted hand-edited file touched must be declared and logged.

## Required Rework
1. Resolve the rebase conflicts in `CHANGELOG.md`, `src/service-worker.js`, and `scripts/sw-precache-hashes.json`, complete the rebase onto `main` (`git rebase --continue`), and regenerate precache hashes with `node scripts/check-sw-version.mjs --update`.
2. Fix the layout/positioning of `.view-options__done` in `src/css/views.css` so it never overlaps the Sort direction segmented control on compact viewports when filter rows are expanded, and recapture the compact view-options screenshot (`after-all-tasks-view-options-compact.png`) to prove the overlap is gone.
3. Update `### Declared Files` in `.plan/tasks/T0054-build-the-view-options-panel-the-more-menu/technical-spec.md` to include all counted hand-edited files touched by the branch.
4. Re-run `npx eslint .`, `npm test`, `npm run check:sw`, and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`, and update `validation-proof.md` with the clean post-rebase output.

