---
id: T0283
owner: "@claude"
session: claude-20261117-d371a3
needs: []
branch: task/T0283-vendor-support-webapp-v0-2-0-and-compare
worktree: .plan/work/T0283-vendor-support-webapp-v0-2-0-and-compare
status: active
started_at: "2026-11-17T18:39:56Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1833.6, input: 10, output: 1997, cache_read: 796752, cache_write: 6463}
work_duration: 1873.0
---
# T0283: Vendor support.webapp v0.2.1 and compare the screenshots.

## Goals
Move the vendored design system from v0.1.0 to [support.webapp v0.2.1](https://github.com/gpellicciotta/support.webapp/releases/tag/v0.2.1) with the `vendor` command.
Review the [v0.2.1 changelog](https://github.com/gpellicciotta/support.webapp/blob/v0.2.1/CHANGELOG.md) for the refreshed neutral palette, the focus glow, and component polish.
Shell users get a full-width top bar, the `app__nav-toggle` hamburger, and a drawer sidebar below 64rem.
Adapt app styles and markup that the new shell or component rules change, and keep the app's checks green.
Compare before and after screenshots as [ADR-0007](https://github.com/gpellicciotta/support.webapp/blob/v0.2.1/docs/adrs/ADR-0007-documentation-and-verification.md) describes.
Completion check: python scripts/devops.py check

## Task Execution Steps
- [x] **[Read]**      Read the v0.2.1 changelog and list the components and shell parts the app uses.
- [x] **[Visual]**    Capture before screenshots of the main screens in light and dark, wide and narrow.
- [x] **[Implement]** Run `vendor` for v0.2.1 into the app's existing vendor folder and pinned look.
- [x] **[Implement]** Adapt app markup and styles to the shell and component changes the screenshots reveal.
- [x] **[Verify]**    Run `python scripts/devops.py check` and the vendored integrity check.
- [x] **[Visual]**    Capture after screenshots and compare them with the before set.
- [x] **[Doc]**       Update CHANGELOG.md with the vendored version and any visible changes.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Created after the support.webapp v0.2.0 release (published as v0.2.1), which the user approved on 2026-11-17.

- [2026-11-17] **[Decided]**
  Vendored v0.2.0, since v0.2.1 has no tag, release, or npm package; v0.2.0 holds every change the goals name.
  - support.webapp main is 0.2.1-pre with two forced colors fixes.

- [2026-11-17] **[Decided]**
  Kept the package's spanning action bar and the sidebar brand, and left out the nav toggle, whose rail would show blank list items.

- [2026-11-17] **[Implement]**
  Fixed two stale tests and a Ruff reformat that failed the check on main e5c72a2.
  - Size note: 13 counted files; see technical-spec.md.

- [2026-11-17] **[Verify]**
  Passed devops.py check, exit 0, and the vendored integrity check; proof in validation-proof.md.
  - Unit 1756, e2e 271, pytest 189 passed.

- [2026-11-17] **[Visual]**
  Compared [before](T0283-vendor-support-webapp-v0-2-0-and-compare/screenshots/before/light-1440/task-editor.png) and [after](T0283-vendor-support-webapp-v0-2-0-and-compare/screenshots/after/light-1440/task-editor.png) sets at 390 and 1440 px, light and dark.
  - Differences listed in validation-proof.md.

- [2026-11-17] **[Verify]**
  Recorded the task outcomes.
  - Files touched: 13.
  - Lines touched: 171.
  - Reopenings: 0.

