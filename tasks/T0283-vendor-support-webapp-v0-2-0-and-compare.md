---
id: T0283
owner: "@claude"
needs: []
branch: task/T0283-vendor-support-webapp-v0-2-0-and-compare
worktree: .plan/work/T0283-vendor-support-webapp-v0-2-0-and-compare
status: active
started_at: "2026-11-17T18:39:56Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the v0.2.1 changelog and list the components and shell parts the app uses.
- [ ] **[Visual]**    Capture before screenshots of the main screens in light and dark, wide and narrow.
- [ ] **[Implement]** Run `vendor` for v0.2.1 into the app's existing vendor folder and pinned look.
- [ ] **[Implement]** Adapt app markup and styles to the shell and component changes the screenshots reveal.
- [ ] **[Verify]**    Run `python scripts/devops.py check` and the vendored integrity check.
- [ ] **[Visual]**    Capture after screenshots and compare them with the before set.
- [ ] **[Doc]**       Update CHANGELOG.md with the vendored version and any visible changes.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Created after the support.webapp v0.2.0 release (published as v0.2.1), which the user approved on 2026-11-17.
