---
id: T0230
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-13T09:11:32Z"
ended_at: "2026-11-13T10:28:43Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@codex"
completion-commit: 56e799bc608f39e8c1258c20fc516e5f7825435c
---
# T0230: Vendor the support.webapp design system with the neutral look and apply its token renames, losslessly.

## Goals
Vendor the first support.webapp release with the `neutral` look, as [ADR-0005](../../../support.webapp/docs/adrs/ADR-0005-distribution-and-versioning.md) describes.
Apply the token renames of [ADR-0001](../../../support.webapp/docs/adrs/ADR-0001-layer-model-and-token-contract.md) and [naming.md](../../../support.webapp/docs/specs/naming.md), each keeping its value.
Search for every renamed token afterwards, so no old name such as `--space-8` silently changes size.
Prove a lossless switch as [ADR-0007](../../../support.webapp/docs/adrs/ADR-0007-documentation-and-verification.md) requires.
Start once support.webapp publishes its first release; see the [roadmap](../../../support.webapp/docs/roadmap.md), Phase 1.

## Task Execution Steps
- [x] **[Read]**      Read the named ADRs and the app at a recorded commit.
- [x] **[Decide]**    Write declared files, size estimate, tests, and the completion check into the technical specification.
- [x] **[Implement]** Write the failing tests named in the technical specification.
- [x] **[Verify]**    Run the new tests and record their failure output in validation-proof.md.
- [x] **[Implement]** Vendor the release and apply the token renames across the stylesheets and scripts.
- [x] **[Verify]**    Run the tests, the vendored check, and the completion check until they pass.
- [x] **[Visual]**    Record the lossless switch proof: screenshots at 390 and 1440 px, light and dark.
- [x] **[Doc]**       List every visual difference as a fix or deliberate change, and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Created from the support.webapp adoption roadmap at the user's request.

- [2026-11-13] **[Read]**
  Read ADR-0001, 0004, 0005, 0007, naming.md, and the app at 0cf4981; exported support.webapp v0.1.0 with git archive.

- [2026-11-13] **[Decided]**
  Imported the vendored base and look files directly, since index.css also loads every component; T0231 switches to index.css.
  - Trial with index.css: 6090 computed-style differences.
  - tokens.css kept only app-local size tokens.

- [2026-11-13] **[Verify]**
  Recorded red output: 185 of 196 targeted unit tests failed before vendoring and renaming.

- [2026-11-13] **[Implement]**
  Vendored 0.1.0, ran the rename sweep, mapped radius-md uses to roles, and wired the check into CI.
  - Size note: 17 counted files, about 490 hand-written lines.

- [2026-11-13] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-13] **[Verify]**
  Independent subagent pre-review found CRLF bytes in the vendored copy; vendored again from an LF export, now byte-identical to v0.1.0.
  - Findings: pre-review-findings.md.
  - Proof rerun: 0 computed-style differences.

- [2026-11-13] **[Visual]**
  Recorded the lossless switch proof: 8 screens at 390 and 1440 px, light and dark, with zero computed-style differences.
  - Before: [task editor](T0230-vendor-the-support-webapp-design-system-with-the/screenshots/before/light-1440/task-editor.png), [settings](T0230-vendor-the-support-webapp-design-system-with-the/screenshots/before/dark-390/settings.png), [all](T0230-vendor-the-support-webapp-design-system-with-the/screenshots/before/)
  - After: [task editor](T0230-vendor-the-support-webapp-design-system-with-the/screenshots/after/light-1440/task-editor.png), [settings](T0230-vendor-the-support-webapp-design-system-with-the/screenshots/after/dark-390/settings.png), [all](T0230-vendor-the-support-webapp-design-system-with-the/screenshots/after/)

- [2026-11-13] **[Doc]**
  Listed no app visual differences; gallery ramps and radius specimen changed deliberately. Updated the style guide, devops guide, and CHANGELOG.md.

- [2026-11-13] **[Implement]**
  Committed the work locally as 56e799b on main; nothing pushed. Agent review is requested and pending a reviewer other than @claude-code.

- [2026-11-13] **[Review]**
  Round 1 approved by @codex.
  - Findings: [review-findings-1.md](T0230-vendor-the-support-webapp-design-system-with-the/review-findings-1.md).

- [2026-11-13] **[Suspended]**
  Completion refused after approval: task file validation failed (1 issue). Fix the cause, then run 'plan tasks stop T0230 --status completed'.
  - line 1: TF017 Completed UI task is missing before and after screenshot links.

- [2026-11-13] **[Verify]**
  Recorded task outcomes against 0cf4981; counted files exclude added, deleted, generated, and vendored files.
  - Files touched: 17.
  - Lines touched: 922, of which 434 come from the mechanical sweep.
  - Reopenings: 0.

- [2026-11-13] **[Complete]**
  Task completed successfully.

