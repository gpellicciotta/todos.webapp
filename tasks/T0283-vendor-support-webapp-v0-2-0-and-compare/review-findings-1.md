---
task: T0283
round: 1
verdict: rejected
blocking: 1
reviewer: "@claude"
reviewed_at: 2026-11-17T19:39:57Z
reviewed_commit: "22c9f57"
base_commit: "e5c72a2"
branch: task/T0283-vendor-support-webapp-v0-2-0-and-compare
---
# Review Findings: Task T0283 (Round 1)

## Summary
The work is solid but vendors the wrong version, so it is rejected.
- The goal names support.webapp v0.2.1; the branch vendors and pins v0.2.0.
- v0.2.1 now exists, so the documented reason for the substitution no longer holds.

Verified in this review:
- `python scripts/devops.py check` (worktree `.venv`) exits 0.
  - Precache: 141 files match VERSION 2026-11-17.35.
  - Vendored integrity and conformance: PASS.
  - Unit: 1756 passed. E2E: 271 passed. Lint: clean. Pytest: 189 passed.
- `shell.css`, `reset.css`, `app-nav.js`, and `detail-panel.css` match `v0.2.0:src/` byte for byte, ignoring line endings.
- App CSS adaptations are correct and minimal: inset glows, layered glows on active chips and the current bottom bar item, separator grid areas, account panel gutters.
- Before, vendored, and after screenshot sets exist: 10 screens each at light and dark, 390 and 1440 px.
- The light 1440 task editor pair matches the described differences.

## Defects
1. **Blocking: vendored v0.2.0 instead of the v0.2.1 the goal requires.**
   - Goal: "Move the vendored design system from v0.1.0 to support.webapp v0.2.1."
   - `design.json`, `src/vendor/design/manifest.json`, `design-system.test.js`, CHANGELOG.md, and visual-style-guide.md all pin 0.2.0.
   - The sibling `support.webapp` has tag `v0.2.1`, also on origin (`git ls-remote --tags origin`: `c2e7347`).
   - Commit `c2e7347` "Released version 0.2.1." is dated 2026-11-17T18:44:32Z.
   - The task started at 18:39:56Z and requested review at 19:39:57Z.
     So the [Decided] entry was likely true when made, but stale before the review request.
   - v0.2.0 to v0.2.1 changes one shipped file: `src/css/reset.css` gains a forced colors rule.
     It paints `:focus-visible` and `.is-focus` outlines in `Highlight`, since a transparent outline rendered translucent.
   - The delivered copy lacks that accessibility fix.

## Process Gaps
Non-blocking:
- Nav toggle: the goal lists `app__nav-toggle` among what shell users get, but the work omits it.
  - The rationale is sound: blank rail items for lists, and the bottom bar already navigates below 64rem.
  - **[Feedback Needed]** A human should confirm that dropping the toggle is acceptable, or file a follow-up task.
- Forced colors on task rows: the row draws `outline: var(--focus-ring-width) solid transparent` via `:has(.task-row__open:focus-visible)`.
  - v0.2.1's `Highlight` rule covers only `:focus-visible` and `.is-focus`, not that `:has()` selector.
  - Without a matching app rule, keyboard focus on a task row keeps the translucent forced colors outline v0.2.1 fixes.
- The task-file log line "Created after the support.webapp v0.2.0 release (published as v0.2.1)" conflicts with the [Decided] entry that no v0.2.1 exists.
- validation-proof.md runs the harness as `work/t0283/capture.spec.js` and `work/t0283/compare.mjs`, while the evidence copies sit in `proof/`.
- technical-spec.md says the v0.2.1 check happened "on 2026-11-17" with no time, so a reader cannot tell it predates the release.

## Required Rework
1. Re-vendor from the sibling's `v0.2.1` tag with the documented `git archive` plus `vendor --look neutral --to src/vendor/design` flow.
2. Update every 0.2.0 pin to 0.2.1:
   - `design.json`
   - `tests/unit/design-system.test.js`
   - visual-style-guide.md
   - the CHANGELOG.md entry, which should also name the forced colors focus fix
3. Refresh the precache hashes and `VERSION` with `node scripts/check-sw-version.mjs --update` if vendored hashes change.
4. Recommended: add a forced colors `Highlight` outline for `.task-row:has(.task-row__open:focus-visible)` so task rows get the v0.2.1 fix.
5. Rerun `python scripts/devops.py check` and the vendored integrity check, and update technical-spec.md and validation-proof.md.
   The [Decided] version entry must reflect v0.2.1.
   Screenshots need no full recapture unless forced colors evidence is added; v0.2.1 changes no default rendering.
