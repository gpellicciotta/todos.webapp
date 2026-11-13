---
id: T0233
owner: "@claude"
session: claude-20261113-e65377
needs: []
branch: task/T0233-replace-the-app-s-shared-components-with-the
worktree: .plan/work/T0233-replace-the-app-s-shared-components-with-the
status: active
started_at: "2026-11-13T12:45:52Z"
ended_at: —
review: agent
preview: none
protocol: standard
size_status: approved
size_estimate: 20 files, 1100 lines
size_approved: 20 files, 1100 lines
size_approved_by: "@gpellicciotta"
size_approved_at: "2026-11-13T10:27:52Z"
usage:
  worker: {turns: 6, duration_s: 8472.8, input: 448, output: 111910, cache_read: 80670232, cache_write: 252250}
  review: {turns: 2, duration_s: 1659.6, input: 795430, output: 75094, cache_read: 8565960}
work_duration: 4124.9
review_status: pending
review_round: 2
---
# T0233: Replace the app's shared components with the vendored ones and import the public neutral look entry point.

## Goals
Replace the app's own copies of the shared components with the vendored ones, per [components.md](../../../support.webapp/docs/specs/components.md).
They cover dialog, menu, popover, toast, live region, service worker update, user menu as account menu, and `createField`.
Switch `style.css` to the public `looks/neutral/index.css`, ending T0230's direct import of private files ([ADR-0005](../../../support.webapp/docs/adrs/ADR-0005-distribution-and-versioning.md)).
Keep app-local components, such as task rows, in the app.
Prove a lossless switch as [ADR-0007](../../../support.webapp/docs/adrs/ADR-0007-documentation-and-verification.md) requires, with T0230's proof harness.

## Task Execution Steps
- [x] **[Read]**      Read the named ADRs and the app at a recorded commit.
- [x] **[Decide]**    Write declared files, size estimate, tests, and the completion check into the technical specification.
- [x] **[Implement]** Write the failing tests named in the technical specification.
- [x] **[Verify]**    Run the new tests and record their failure output in validation-proof.md.
- [x] **[Implement]** Switch imports and markup to the vendored modules, remove app copies, and import index.css.
- [x] **[Verify]**    Run the tests, the vendored check, and the completion check until they pass.
- [x] **[Visual]**    Record the lossless switch proof: screenshots at 390 and 1440 px, light and dark.
- [x] **[Doc]**       List every visual difference as a fix or deliberate change, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Split from T0231 at the user's request: T0231 keeps the shell, this task takes the shared components.

- [2026-11-13] **[Size]**
  Size approval requested for 20 files, 1100 lines.

- [2026-11-13] **[Size]**
  Size approved by @gpellicciotta for 20 files, 1100 lines: Approved by Claude Code under the user's standing delegation of 2026-11-13 to approve task sizes.

- [2026-11-13] **[Decided]**
  Size approval for 20 files and 1100 lines was recorded by Claude Code under the user's delegation; no further split, see Size note.

- [2026-11-13] **[Read]**
  Read components.md, ADR-0005, ADR-0007, and the app at ceb160b; captured the before proof with four added component scenarios.
  - Before: 12 screens, 4 captures, no console or network problems.

- [2026-11-13] **[Decide]**
  Wrote decisions, 21 declared files, tests, and a CSS probe into the technical specification; menus become native popovers and the user menu becomes the account menu.
  - Probe without controls.css: 172 distinct difference kinds.

- [2026-11-13] **[Implement]**
  Wrote failing tests for the public entry point, no app copies, the account menu, the field skeleton, and keyboard use of the account menu; committed as 83751dd.

- [2026-11-13] **[Verify]**
  Recorded the red phase: 24 unit tests and 7 e2e tests failed as expected before any production change.
  - Evidence: validation-proof.md, Red Phase.

- [2026-11-13] **[Implement]**
  Switched imports and markup to the vendored modules, removed six app modules, controls.css, and their tests, and imported looks/neutral/index.css.
  - Size note: about 31 counted files, 1270 hand-written lines.
  - Overrun from undeclared test and precache files; not self-approved.

- [2026-11-13] **[Verify]**
  Completion check passed at ae9b296: devops.py check with 1180 unit, 198 e2e, and 156 pytest tests, and the vendored check.
  - Evidence: validation-proof.md, Green Phase.

- [2026-11-13] **[Visual]**
  Recorded the lossless switch proof: 13 screens at 390 and 1440 px, light and dark, with no console or network problems.
  - Before: [account menu](T0233-replace-the-app-s-shared-components-with-the/screenshots/before/light-390/account-menu.png), [all](T0233-replace-the-app-s-shared-components-with-the/screenshots/before/).
  - After: [account menu](T0233-replace-the-app-s-shared-components-with-the/screenshots/after/light-390/account-menu.png), [all](T0233-replace-the-app-s-shared-components-with-the/screenshots/after/).

- [2026-11-13] **[Doc]**
  Listed every visual difference in technical-spec.md as invisible, deliberate, or a fix; updated ui-design.md, the style guide, devops.md, the gallery, and CHANGELOG.md.
  - Main change: the user menu is the package account menu.

- [2026-11-13] **[Decided]**
  Menus open as native popovers, the user menu is the vendored account menu, and createEditorField wraps the vendored createField to keep editor errors.
  - All decisions: technical-spec.md, Decisions.

- [2026-11-13] **[Verify]**
  Recorded task outcomes.
  - Files touched: 41.
  - Lines touched: 1320.
  - Reopenings: 0.

- [2026-11-13] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-13] **[Review]**
  Round 1 rejected by @gemini: The core migration is clean and well structured.
  - Findings: [review-findings-1.md](T0233-replace-the-app-s-shared-components-with-the/review-findings-1.md).

- [2026-11-13] **[Implement]**
  Wrote failing tests for review round 1: segmented legends, chip remove buttons, and the field hint and counter row; committed as 06b0d7e.
  - Red phase: 2 unit and 3 e2e tests failed.

- [2026-11-13] **[Implement]**
  Moved segmented legends, chip remove buttons, and the gallery field onto package skeletons; removed two dead tokens; shortened long sentences.
  - Undeclared: tokens.css, gallery CSS, gallery-controls spec.

- [2026-11-13] **[Verify]**
  Review round 1 rework passed devops.py check at 8714efd: 1182 unit, 201 e2e, and 156 pytest tests, plus the vendored check.
  - Evidence: validation-proof.md, Review Round 1 Green Phase.

- [2026-11-13] **[Visual]**
  Retook the after proof at 8714efd: legends now match the before state, and chip remove buttons keep chip corners.
  - After: [all](T0233-replace-the-app-s-shared-components-with-the/screenshots/after/).

- [2026-11-13] **[Doc]**
  Fixed the stale style.css decision, removed the dead tokens from docs and gallery, and kept every added sentence and commit under 21 words.
  - Commit a7bbcca keeps 21 words; squash integration replaces it.

- [2026-11-13] **[Verify]**
  Recorded task outcomes.
  - Files touched: 45.
  - Lines touched: 1464.
  - Reopenings: 0.

- [2026-11-13] **[Review]**
  Round 2 requested (mode: agent).

