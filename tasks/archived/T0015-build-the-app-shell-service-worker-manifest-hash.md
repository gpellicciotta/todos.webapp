---
id: T0015
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T15:34:29Z"
ended_at: "2026-11-04T16:24:41Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 1a44b10a0795da282f1c3310ff75fb9992931f52
---
# T0015: Build the app shell: service worker, manifest, hash router, compact and wide layouts, and navigation

## Goals
Add the hash router with the routes of docs/specs/ui-design.md, restoring scroll position per route.
Render the compact layout with top and bottom bars, and the wide layout with sidebar and editor panel slot.
Start the app: open the store, run overdue handling and the purge, start the overdue timer, and apply the theme.
Split on 2026-11-04 for size: the PWA moved to T0034, store events to T0032, and design fixes to T0033.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's Layout and Navigation section and the shell wireframes.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the manifest, service worker, router, layout, and app entry point.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [x] **[Doc]**       Update ui-design.md where the shell differs, docs/devops.md for offline testing, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-04] **[Implement]**
  Size note: the working diff reached about 1692 counted lines, past three times the 450-line estimate; work stopped for a split or sign-off.
  - Tracked files: 303 lines; new files: 1389 lines.
  - Docs, validation proof, and steps 3 to 6 remain open.

- [2026-11-04] **[Verify]**
  Recorded red output against stage 2 and green output at stage 3 in validation-proof.md.
  - Files touched: 11, adding src/css/style.css and tests/unit/tokens.test.js.
  - Lines touched: 1092, above the large line, under three times 450.
  - Size note: router, layout, and their tests only merge together.

- [2026-11-04] **[Visual]**
  Shell compared at 390 and 1440 px: [before](T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/shell-390-light-before.png) and [after](T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/shell-1440-dark-after.png).

- [2026-11-04] **[Review]**
  Agent review of the split stages approved this task; minor findings were recorded as T0016 follow-ups.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 12.
  - Lines touched: 1093.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

