---
task: T0254
round: 1
verdict: approved
blocking: 0
reviewer: "@gemini"
reviewed_at: 2026-11-24T12:06:28Z
reviewed_commit: "035f279"
base_commit: "e0503fa"
branch: task/T0254-vendor-support-webapp-v0-5-1-and-adapt
session: antigravity-20261124-46c597
session_agent: antigravity
session_created_at: 2026-11-24T11:59:03Z
---
# Review Findings: Task T0254 (Round 1)

## Summary
Approved. Commit `035f279` cleanly vendors `support.webapp` v0.5.1 (commit `08df4fe`, LF bytes across all 104 vendored files) and adapts the sprite glyphs, view header margin, service worker precache, module preloads, tests, and documentation while leaving new package modules unused.

Independent verification of `python scripts/devops.py check` exited 0:
- `check-sw-version.mjs`: 151 precached files match `VERSION 2026-11-24.2`.
- `src/vendor/design/bin/check.mjs`: integrity PASS, conformance PASS.
- `npm test` (Vitest): 67 files, 1786 tests passed.
- `npm run lint` (ESLint): passed.
- `npm run test:e2e` (Playwright): 275 passed.
- Ruff check/format and `pytest`: 190 passed.

Key design decisions verified:
- Keeping sidebar `title` attributes in `src/js/ui/layout.js` (documented with `**[Decided]**`) is sound: `attachLabelTooltips` reads `title` via `labelOf()` (avoiding falling back to monogram + count + visually-hidden text) and removes `title` while `.tooltip--label` is open, which `tests/e2e/shell.spec.js` proves for both hover and keyboard focus.
- Compact layout hides `.app__nav-toggle` because the app renders `.app__bottom-nav`, so no drawer opens below 64rem; `icon-nav-close` is still present in `src/img/icons.svg` and verified by `tests/unit/design-system.test.js`.
- Visual inspection of the before/after screenshots at 1440 px light and 390 px dark confirms only the wide nav toggle glyph changed.

## Defects
None.

## Process Gaps
- Non-blocking: In `src/demo/visual-style-gallery.html` (line 987), the static rail specimen button keeps `aria-label="Hide navigation"` paired with `#icon-nav-menu` instead of `#icon-nav-hide`.
- Non-blocking: In `src/css/app-components.css` (lines 648–653), `.view-header__title` still declares `min-inline-size: 0` and `margin: 0`, which vendored `view-header.css` now provides.
- Non-blocking: Two new entries in `CHANGELOG.md` (lines 79 and 81) exceed the 20-word prose guideline (28 and 23 words).

## Required Rework
None.
