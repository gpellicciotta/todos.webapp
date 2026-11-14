---
task: T0233
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-13T13:54:34Z
reviewed_commit: "ae9b296"
base_commit: "ceb160b"
branch: task/T0233-replace-the-app-s-shared-components-with-the
---
# Review Findings: Task T0233 (Round 1)

## Summary
The core migration is clean and well structured.
`src/css/style.css` imports only `../vendor/design/looks/neutral/index.css`, and the six duplicated UI modules and `src/css/controls.css` are gone.
`user-menu.js`, `createEditorField`, lazy row menus, precache checks, ESLint, Vitest (1180 tests), vendor conformance, and Playwright suites pass.
However, three unmigrated markup skeletons cause visual and interaction regressions after deleting `src/css/controls.css`.
Stale design-system documentation, dead app-local tokens, and 20-word prose and commit-message violations also require rework before approval.

## Defects
1. **Orphaned `.field__meta` wrapper breaks the gallery Field hint and counter layout** (`src/demo/visual-style-gallery.html:414-417`):
   - Deleting `src/css/controls.css` removed `.field__meta`, and `src/css/app-components.css` did not retain it despite `technical-spec.md:47`.
   - Vendored `src/vendor/design/css/components/field.css:141-149` places `.field > .field__hint` and `.field > .field__counter` via child combinators.
   - Wrapping both in `<div class="field__meta">` breaks the grid row, stacking them left-aligned without `tabular-nums`.
2. **Visible `.segmented` controls omit `.segmented__legend`, regressing legend weight, spacing, and alignment** (`src/js/views/task-editor.js:71`, `src/demo/visual-style-gallery.html:512,521,1421`):
   - Vendored `src/vendor/design/css/components/segmented.css:15-19` styles `.segmented__legend` (`margin-block-end: var(--space-1); padding: 0; font-weight: var(--weight-medium)`).
   - Bare `<legend>` elements lose medium weight (`500` to `400`), lose the `4px` bottom margin, and gain `2px` browser padding (`screenshots/after/light-1440/field-error.png`).
   - `technical-spec.md:147` misclassified this missing class as a deliberate package style difference.
3. **Removable chips use `.icon-button` instead of `.chip__remove`, losing pill radius and light-mode hover contrast** (`src/js/views/task-editor.js:415`, `src/css/views.css:225`, `src/demo/visual-style-gallery.html:480,484,1452,1453`):
   - Vendored `src/vendor/design/css/components/chip.css:38-61` defines `.chip__remove` with `--radius-chip` and `:hover { background-color: var(--color-surface) }`.
   - In the neutral look's light theme, `--color-surface-sunken` and `--color-surface-hover` both resolve to `--gray-100`.
   - Keeping `.icon-button` inside `.chip--removable` produces zero background hover change in light mode and `8px` button corners.
   - Also note `src/js/views/task-editor.js:418` sets `button.disabled = true` on viewer-only shared lists while `fields.disabled` is `false`, and `chip.css` defines no `.chip__remove:disabled` rule.
4. **Stale architecture decision and dead app-local tokens remain in docs, `tokens.css`, and gallery** (`docs/specs/visual-style-guide.md:82-83,146,148`, `src/css/tokens.css:16-17`, `src/demo/visual-style-gallery.html:254-255`, `src/demo/visual-style-gallery.css:358,392`):
   - `docs/specs/visual-style-guide.md:82-83` still states `style.css` imports private base and look files until component adoption, contradicting line 12.
   - `--width-segment-min` (`7.5rem`) and `--height-textarea-min` (`5.5rem`) in `src/css/tokens.css:16-17` have zero component consumers now that `segmented.css` (`8.5rem`) and `field.css` (`calc(var(--target-min) * 2)`) govern those sizes, leaving the style guide and gallery Sizes specimens inaccurate.

## Process Gaps
1. **Modified prose and changelog entries exceed the 20-word sentence cap**:
   - `CHANGELOG.md:16` (22 words after `FrontEnd:`, 23 total) exceeds the 20-word limit in `change-management-guidelines` and General Guidelines.
   - `docs/specs/ui-design.md:109` (23 words) and `docs/specs/ui-design.md:146` (23 words) exceed the 20-word prose cap.
   - `docs/specs/visual-style-guide.md:254` (22 words) and `docs/specs/visual-style-guide.md:255-256` (30 words) exceed the 20-word prose cap.
2. **Commit message exceeds the 20-word cap**:
   - Commit `a7bbcca` contains 21 words, exceeding the 20-word maximum in General Guidelines.
3. **Test coverage missed CSS-only component skeleton migrations**:
   - Unit and gallery e2e tests covered `field.js` and `account-menu.js`, but did not assert `.segmented__legend`, `.chip__remove`, or direct `.field > .field__hint` and `.field > .field__counter` placement.

## Required Rework
1. **Write failing unit and gallery e2e tests first (TDD)** covering:
   - `.segmented__legend` on visible segmented legends in the task editor and gallery;
   - `.chip__remove` (including light-mode hover contrast and disabled state) on removable chips in the task editor and gallery;
   - same-row placement of `.field > .field__hint` and right-aligned `.field > .field__counter` in the gallery Field specimen.
2. **Fix the Field counter specimen** in `src/demo/visual-style-gallery.html:414-417` by unwrapping `<div class="field__meta">` so `.field__hint` and `.field__counter` are direct children of `.field` matching `field.css`.
3. **Apply `.segmented__legend`** to visible `<legend>` elements inside `.segmented` in `src/js/views/task-editor.js:71` and `src/demo/visual-style-gallery.html:512,521,1421`, and update `technical-spec.md` (`Probe at Decide Time` and `Visual Differences` line 147) plus after-screenshots/snapshots accordingly.
4. **Migrate removable chips to `.chip__remove`** in `src/js/views/task-editor.js:415` and `src/demo/visual-style-gallery.html:480,484,1452,1453`, update `src/css/views.css:225` to `.chip--removable .chip__remove`, and ensure `.chip__remove:disabled` suppresses hover/active feedback and pointer cursor.
5. **Reconcile tokens and style documentation**:
   - Update or replace the obsolete `**[Decided]**` bullet at `docs/specs/visual-style-guide.md:82-83`.
   - Remove unused `--width-segment-min` and `--height-textarea-min` from `src/css/tokens.css`, `docs/specs/visual-style-guide.md:146,148`, `src/demo/visual-style-gallery.html:254-255`, and `src/demo/visual-style-gallery.css:358,392` (updating `src/css/tokens.css:11` comment accordingly).
6. **Tighten prose and commit messages to at most 20 words**:
   - Shorten `CHANGELOG.md:16`, `docs/specs/ui-design.md:109,146`, and `docs/specs/visual-style-guide.md:254-256` to <= 20 words per sentence.
   - Keep all rework commit messages <= 20 words (and rewrite `a7bbcca` only if branch history is local and safe, otherwise keep subsequent commits compliant for squash/merge).
7. **Re-run verification and update precache**: bump `VERSION` and regenerate `scripts/sw-precache-hashes.json` via `node scripts/check-sw-version.mjs --update`, then verify `python scripts/devops.py check` and `node src/vendor/design/bin/check.mjs` exit 0.
