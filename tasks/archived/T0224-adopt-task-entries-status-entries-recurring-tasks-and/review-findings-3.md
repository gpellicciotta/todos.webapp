---
task: T0224
round: 3
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T09:04:12Z
reviewed_commit: "6bd3d3c"
base_commit: "4e687d7"
branch: task/T0224-adopt-task-entries-status-entries-recurring-tasks-and
session: antigravity-20261115-e981a1
session_agent: antigravity
session_created_at: 2026-11-15T08:48:10Z
---
# Review Findings: Task T0224 (Round 3)

## Summary
The `main` merge (`4e687d7` -> `6bd3d3c`) integrates cleanly with one-click completion, quick-add parsing, and collapsible group headers. Automated checks pass (`npm run lint`, `npm run check:sw`, 1283 unit tests, 9 contract tests, 89 Playwright e2e tests). However, two sync defects (`D1`, `D2`) and one style-guide drift (`P1`) require surgical fixes before approval.

## Defects
- **D1 — Sync log loses task identity and link for `rules` and adopted `event`/`note` entries** (`src/js/views/sync-log.js:165`, `src/js/sync/adopt.js:254`):
  - `queue.js:211` and `migrate.js:99` moved `due-time`, `overdue-handling`, and other rule edits to `target: { type: 'rules', id: taskId }`.
  - `findItem` in `src/js/views/sync-log.js:165` resolves `task`, `target['task-id']`, and `membership`, ignoring `target.type === 'rules'`.
  - Overwritten rule fields and rejected `update-rules` entries render as `An item` without `#/tasks/<id>` links, regressing `SYN-8` and `SYN-9`.
  - `src/js/sync/adopt.js:254` logs refused `event` and `note` adoption steps without `'task-id'`, likewise falling back to `An item`.
  - `tests/unit/sync-log-view.test.js:59` and `tests/e2e/sync.spec.js:133` still seed `due-time` conflicts under `target.type = 'task'`, masking this regression.
- **D2 — Pulled task merge folds queued events across mismatched occurrences** (`src/js/sync/merge.js:288`):
  - `planPage` folds every queued `post-event` for `incoming.id` onto `next['current-occurrence']` without checking `entry.fields.occurrence`.
  - When the server rolls a recurring task to a newer occurrence, older queued events corrupt the new `current-occurrence`.

## Process Gaps
- **P1 — Stale `status-todo` icon name in visual style guide** (`docs/specs/visual-style-guide.md:324`):
  - `src/img/icons.svg` renamed `#status-todo` to `#status-ready`, but `docs/specs/visual-style-guide.md:324` still lists `status-todo`, violating `ui-guidelines`.

## Required Rework
1. Update `findItem` in `src/js/views/sync-log.js:165` so `target.type === 'rules'` resolves `taskId = target.id`.
2. Include `'task-id': step.record['task-id']` when `step.record['task-id']` exists in `src/js/sync/adopt.js:254` rejection log targets.
3. Update `tests/unit/sync-log-view.test.js` and `tests/e2e/sync.spec.js` to cover `target: { type: 'rules', id }` and adopted event rejections.
4. Filter queued events in `src/js/sync/merge.js:288` to `(entry.fields.occurrence ?? next['current-occurrence'].occurrence) === next['current-occurrence'].occurrence`, with a unit test in `tests/unit/merge.test.js`.
5. Replace `status-todo` with `status-ready` in `docs/specs/visual-style-guide.md:324`.
6. Refresh `src/service-worker.js` and `scripts/sw-precache-hashes.json` (`npm run check:sw`) after updating `src/` files.
