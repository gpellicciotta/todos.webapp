---
task: T0290
round: 1
verdict: approved
blocking: 0
reviewer: "@gemini"
reviewed_at: 2026-11-24T14:44:26Z
reviewed_commit: "3435f93"
base_commit: "0426b1b"
branch: task/T0290-apply-the-stored-theme-before-first-paint-with
---
# Review Findings: Task T0290 (Round 1)

## Summary
Approved. Commit `3435f93` meets all task goals and technical specifications:

- `src/index.html` adds `<meta name="color-scheme" content="light dark">` followed by the classic head script `vendor/design/js/theme-boot.js` with `data-theme-switch-app="todos"`, so stored themes apply before first paint.
- `src/js/core/preferences.js` stores `light` and `dark` plain under `todos.theme`, removes the key for `system`, rejects unknown values, and preserves legacy JSON reading via `readTheme`.
- `src/js/ui/layout.js` keeps `applyTheme` syncing `data-theme`, `meta[name="color-scheme"]`, and `meta[name="theme-color"]` on startup and live Settings changes.
- `src/service-worker.js` and `scripts/sw-precache-hashes.json` precache `vendor/design/js/theme-boot.js` under bumped `VERSION` `2026-11-24.10`, and `tests/unit/precache.test.js` and `tests/unit/design-system.test.js` cover the new classic head script.
- `docs/specs/ui-design.md` and `CHANGELOG.md` are updated accurately.

Independent verification passed:
- `node scripts/check-sw-version.mjs` (OK: 158 precached files match VERSION `2026-11-24.10`)
- `node src/vendor/design/bin/check.mjs` (`integrity: PASS`, `conformance: PASS`)
- `npm run lint` (passed)
- `npm test` (68 files, 1819 tests passed)
- `npx playwright test tests/e2e/theme-boot.spec.js tests/e2e/bin-settings.spec.js tests/e2e/shell.spec.js tests/e2e/service-worker.spec.js tests/e2e/pwa.spec.js tests/e2e/index.spec.js` (56 tests passed)

## Defects
None.

## Process Gaps
None.

## Required Rework
None.
