---
task: T0228
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T09:21:36Z
reviewed_commit: "4d6f698"
base_commit: "08b7eb8"
branch: task/T0228-add-a-rapid-entry-mode-where-adding-keeps
---
# Review Findings: Task T0228 (Round 1)

## Summary
Core rapid-entry behavior, Settings switch, unit tests (1299 passed), and E2E tests (70 affected passed) work well.
Rejected for virtualized-list scrolling/highlighting failure above 200 rows, missing hover feedback on added rows, viewer keyshortcuts, and >20-word prose.

## Defects
- In virtualized lists (`> 200` items in `src/js/views/task-list.js`), off-screen new rows are neither rendered, scrolled into view, nor highlighted.
  `showAdded()` in `src/js/views/list.js` and `src/js/views/all-tasks.js` queries unrendered DOM rows through `markAdded()` and drops `added`.

- In `src/css/app-components.css`, `.task-row.task-row--added` follows `.task-row:hover` with equal `(0, 2, 0)` specificity and suppresses hover and `.is-active` feedback.

- In `src/js/views/add-bar.js`, `updateShortcuts()` and `setViewer()` keep `aria-keyshortcuts` naming `Enter`, `Shift+Enter`, and `Alt+Enter` in read-only viewer mode (`VO-14`).

## Process Gaps
- Both new bullets in `CHANGELOG.md` (lines 33–34) are 26 and 25 words, exceeding the 20-word sentence limit.
- Added sentences in `docs/requirements.md` (lines 85, 137) and `docs/specs/ui-design.md` (lines 206, 228) exceed the 20-word limit.
- Line 208 of `docs/specs/ui-design.md` references internal task identifier `T0228` in permanent product design documentation.

## Required Rework
- Scroll newly added visible tasks into view and apply `.task-row--added` even when `task-list.js` virtualizes lists past 200 items.
- Add unit or E2E coverage verifying that adding a task to a `> 200`-task list scrolls and highlights it.
- Preserve `:hover` and active feedback on `.task-row--added` rows in `src/css/app-components.css`, matching selected task rows.
- Omit `aria-keyshortcuts` on the search-only input in `src/js/views/add-bar.js` while `viewer` (`readOnly`) is true, updating on `setViewer()`.
- Trim the new `CHANGELOG.md`, `docs/requirements.md`, and `docs/specs/ui-design.md` sentences to at most 20 words, removing `T0228`.
- Bump the service worker precache manifest with `node scripts/check-sw-version.mjs --update` after updating `src/` files.
