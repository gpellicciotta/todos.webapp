---
task: T0231
round: 1
verdict: approved
reviewer: "@gemini"
reviewed_at: 2026-11-13T12:35:09Z
reviewed_commit: "32f511e"
base_commit: "56e799b"
branch: task/T0231-move-the-app-shell-and-shared-components-onto
---
# Review Findings: Task T0231 (Round 1)

## Summary
Approved commit `32f511e` against `56e799b` on branch `task/T0231-move-the-app-shell-and-shared-components-onto`.
- Verified ADR-0004 shell adoption in `src/css/style.css`, `src/js/ui/layout.js`, `src/js/app.js`, and screen controllers (`all-tasks.js`, `list.js`, `lists.js`), with `src/css/app-shell.css` removed and service-worker precache hashes updated.
- Confirmed `app--scroll-main`, skip-link focus without hash clobbering, conditional `app__action-bar` and `app__banners` `:has()` handling, side-panel sheet/column behavior, and `app__overlays` placement for `.toast-region` and `.fab`.
- Ran `node scripts/check-sw-version.mjs`, `node src/vendor/design/bin/check.mjs` (zero errors and zero warnings), `npm run lint`, `npm test` (60 files, 1,250 tests), 92 affected Playwright e2e tests (`shell`, `list`, `lists`, and `gallery*` specs), and `plan tasks validate T0231`.
- Inspected red/green TDD evidence in `validation-proof.md`, `proof/compare-shell.mjs`, and representative 390 px and 1440 px light/dark before/after screenshots; every visual difference is documented in `technical-spec.md`, and counted size (18 files, 434 lines) stays within the large line with a documented size note.
- Non-blocking observations for T0233 or follow-up cleanup: `<aside class="app__side-panel">` currently wraps `<aside class="editor-panel" aria-labelledby="...">` (two nested `<aside>` elements because `.editor-panel` stayed untouched per task scope), `docs/specs/ui-design.md:502` still says "above the rows" right before line 503's updated "under the rows", and `src/css/app-chrome.css:685` plus `src/demo/visual-style-gallery.html:264,1226` retain minor pre-move phrasing on `--elevation-2` and compact add-bar placement.

## Defects
None.

## Process Gaps
None.

## Required Rework
None.
