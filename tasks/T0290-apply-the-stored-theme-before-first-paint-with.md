---
id: T0290
owner: "@claude"
session: claude-20261124-6a2935
needs: []
branch: task/T0290-apply-the-stored-theme-before-first-paint-with
worktree: .plan/work/T0290-apply-the-stored-theme-before-first-paint-with
status: completed
started_at: "2026-11-24T14:32:00Z"
ended_at: "2026-11-24T14:48:32Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 734.2, input: 94, output: 21034, cache_read: 3702571, cache_write: 87135}
  review: {turns: 1, duration_s: 241.2, input: 136526, output: 8431, cache_read: 1129000}
review_status: approved
review_round: 1
review_requested_at: "2026-11-24T14:44:25Z"
reviewed_by: "@gemini"
review_session: antigravity-20261124-45e412
work_duration: 991.8
completion-commit: 8128df6e6af638395cbb0cbc724c3e37a09175ea
---
# T0290: Apply the stored theme before first paint with the vendored theme-boot.js

## Goals
Load the vendored `js/theme-boot.js` as a classic script in the head of index.html, so a stored theme paints first.
Today [app.js](../../src/js/app.js) applies the theme only once the module graph runs, after the first paint.
Store `todos.theme` as plain `light` or `dark`, which theme-boot reads; `readTheme` already accepts both forms.
Add `<meta name="color-scheme">`, which theme-boot updates, as the package's starter index.html does.
Keep `applyTheme` for the `theme-color` metas and live changes from Settings.

## Task Execution Steps
- [x] **[Read]**      Read the vendored theme-boot.js and the starter template index.html of support.webapp v0.5.1.
- [x] **[Implement]** Write the unit and e2e tests of the technical spec.
- [x] **[Verify]**    Run them and confirm they fail on main.
- [x] **[Implement]** Add the boot script and color-scheme meta, store the theme plain, and precache the script.
- [x] **[Verify]**    Run the completion check.
- [x] **[Doc]**       Update the UI design spec and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.

- [2026-11-24] **[Decided]**
  Synced the color-scheme meta in applyTheme too, as vendored theme-switch.js does, so a live switch to System undoes the boot value.

- [2026-11-24] **[Implement]**
  Touched four undeclared files: layout.js and its test for the meta, and the precache and public-entry tests that must accept theme-boot.js.

- [2026-11-24] **[Verify]**
  Size note: 9 counted files and 94 changed lines cross the 8-file typical line; the four undeclared files are fix-ups this change requires.

- [2026-11-24] **[Verify]**
  Unit and e2e tests failed before the change, and python scripts/devops.py check passed after it; see validation-proof.md.

- [2026-11-24] **[Verify]**
  Recorded task outcomes.
  - Files touched: 9.
  - Lines touched: 94.
  - Reopenings: 0.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-24] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0290-apply-the-stored-theme-before-first-paint-with/review-findings-1.md).

- [2026-11-24] **[Complete]**
  Task completed successfully.

