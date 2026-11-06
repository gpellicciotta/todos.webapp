---
id: T0049
owner: "@codex"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-06T14:14:38Z"
ended_at: "2026-11-06T17:44:04Z"
review: human
preview: none
protocol: adhoc
review_status: approved
review_round: 3
reviewed_by: "@user"
completion-commit: 090e7ed40fbfc505f5e38f0e01138dce41fb2812
---
# T0049: Remove the sidebar New list action

## Goals
Remove the sidebar New list action entirely.
Keep one Lists navigation row with its existing icon and link.
The Lists screen button stays as it is.
Keep the accessible name "New list" and the existing route.
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`

## Task Execution Steps
- [x] **[Read]**      Read layout.js and the icon-button styles in controls.css.
- [x] **[Implement]** Author tests rejecting sidebar creation and verifying the main Lists view plus opens the editor.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Remove sidebar list creation and retain the Lists screen floating plus.
- [x] **[Visual]**    Capture before and after screenshots in light and dark themes at two widths.
- [x] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-05] **[Review]**
  Review raised from agent to human.


- [2026-11-06] **[Decided]**
  Added the gallery and style guide to declared files because the shared sidebar pattern changed. Seven counted files changed, totaling 80 lines.

- [2026-11-06] **[Verify]**
  Recorded failing-first unit coverage, passing unit and browser suites, lint, and [validation-proof.md](T0049-replace-the-new-list-button-with-a-subtle/validation-proof.md).

- [2026-11-06] **[Visual]**
  Captured before and after app and gallery screenshots in both themes at 390 and 1440 px.
  See [validation-proof.md](T0049-replace-the-new-list-button-with-a-subtle/validation-proof.md) for captures and browser checks.

- [2026-11-06] **[Implement]**
  Started `node scripts/serve.mjs --port 8755`, PID 68016, for local preview. Logs: `server.log` and `server-error.log`.

- [2026-11-06] **[Review]**
  Round 1 requested (mode: human).

- [2026-11-06] **[Review]**
  Round 1 rejected by @user: Remove the duplicate Lists row and place the plus beside the existing Lists navigation link and icon.

- [2026-11-06] **[Decided]**
  Applied human review correction: removed the extra Lists heading and placed the plus beside the existing Lists icon and navigation link.

- [2026-11-06] **[Review]**
  Round 2 requested (mode: human).

- [2026-11-06] **[Review]**
  Round 2 rejected by @user: Remove the sidebar New list action entirely; retain the main Lists view plus.

- [2026-11-06] **[Decided]**
  Removed sidebar list creation at the user request. Preserved the existing Lists navigation link and the main Lists view floating plus. Updated tests, gallery, guide, and changelog.

- [2026-11-06] **[Verify]**
  Expanded declared files to include the list editor integration test. Current scope totals eight counted files and 43 changed lines.

- [2026-11-06] **[Review]**
  Round 3 requested (mode: human).

- [2026-11-06] **[Review]**
  Round 3 approved by @user.

- [2026-11-06] **[Verify]**
  Recorded approved outcomes; added package metadata for the development patch increment. Size note: nine files preserve one sidebar concern and required release metadata.
  - Files touched: 10.
  - Lines touched: 49.
  - Reopenings: 0.

- [2026-11-06] **[Verify]**
  Advanced service worker cache metadata; cache consistency and 30 service worker unit tests passed. Size note: ten counted files include required release and cache metadata.

- [2026-11-06] **[Complete]**
  Task completed successfully.

