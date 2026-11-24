---
id: T0254
owner: "@claude"
session: claude-20261117-fc9300
needs: []
branch: task/T0254-vendor-support-webapp-v0-5-1-and-adapt
worktree: .plan/work/T0254-vendor-support-webapp-v0-5-1-and-adapt
status: completed
started_at: "2026-11-24T11:43:22Z"
ended_at: "2026-11-24T12:06:29Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 928.2, input: 88, output: 20687, cache_read: 4832966, cache_write: 121169}
  review: {turns: 1, duration_s: 441.2, input: 191872, output: 16462, cache_read: 2758596}
review_status: approved
review_round: 1
review_requested_at: "2026-11-24T11:59:02Z"
reviewed_by: "@gemini"
review_session: antigravity-20261124-46c597
work_duration: 1387.1
completion-commit: 2fa3430c058e9857b02243030033fa96f6693ae0
---
# T0254: Vendor support.webapp v0.5.1 and adapt the app to its shell, nav toggle, and component changes

## Goals
Move the vendored design system from v0.2.1 to support.webapp v0.5.1, released 2026-11-24.
Keep every screen looking and behaving as on main, apart from the package changes adopted on purpose.
Adapt the app where v0.5.1 changes shared classes, the nav toggle, or the shell, as the technical spec lists.
Keep new package modules unused here; follow-up tasks adopt them one at a time.
Completion check: `python scripts/devops.py check`, plus the screenshot comparison in the technical spec.

## Task Execution Steps
- [x] **[Read]**      Read the support.webapp changelog from v0.3.0 to v0.5.1 and docs/devops.md Vendored Design System.
- [x] **[Implement]** Vendor v0.5.1 and update design.json, the precache list, and its hashes.
- [x] **[Verify]**    Run the check and the e2e suite; record each failure the new package causes.
- [x] **[Implement]** Update design-system and shell tests for the new pin, nav toggle glyphs, and rail tooltips; prove them failing.
- [x] **[Implement]** Adapt view headers, the nav toggle sprite glyphs, and rail entry titles to v0.5.1.
- [x] **[Verify]**    Run the completion check and compare screenshots at 390 and 1440 px in both themes.
- [x] **[Doc]**       Update devops.md, the visual style guide, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Decided]**
  Suspended as superseded: main vendored support.webapp 0.2.1 through T0283, which already holds T0049's switch.

- [2026-11-24] **[Doc]**
  Companion task file scaffolded when the protocol changed from adhoc to standard.

- [2026-11-24] **[Decided]**
  Reopened as the v0.5.1 upgrade after support.webapp released it; T0286 waits on it.

- [2026-11-24] **[Decided]**
  Kept sidebar title attributes: the package tooltip removes the title while it shows, so one tooltip appears; e2e proves it.

- [2026-11-24] **[Decided]**
  Added src/demo gallery and ui-design.md edits outside the declared files; the gallery sprite reference needed icon-nav-menu.

- [2026-11-24] **[Verify]**
  Recorded outcomes.
  - Files touched: 15.
  - Lines touched: 140.
  - Reopenings: 0.

- [2026-11-24] **[Read]**
  Read the support.webapp changelog v0.3.0 to v0.5.1 and the devops vendoring section.

- [2026-11-24] **[Implement]**
  Vendored v0.5.1, bumped the service worker, adapted the sprite, tests, and view header margin.

- [2026-11-24] **[Doc]**
  Updated devops.md, the style guide, ui-design.md, and CHANGELOG.md.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-24] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0254-vendor-support-webapp-v0-5-1-and-adapt/review-findings-1.md).

- [2026-11-24] **[Complete]**
  Task completed successfully.

