---
id: T0020
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T19:05:23Z"
ended_at: "2026-11-04T20:23:42Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: f7e83ffdcbd779ec0b86347f48d3e3603ef5490f
---
# T0020: Build the Recycle bin and Settings screens with theme selection and the local connection card

## Goals
Build the Recycle bin per docs/specs/ui-design.md, with restore and in-row confirmed permanent delete (`BIN-1` to `BIN-4`).
Build Settings with Appearance, Data, Connection with the server URL, and About sections.
Make the theme choice apply at once and persist per device.
Leave the Export, Import, and Connect buttons to their own tasks, shown disabled until then.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's Recycle Bin and Settings sections and their wireframes.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the recycle bin and settings views and the preferences module.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [x] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-04] **[Implement]**
  Built the Recycle bin and Settings screens, the theme and server URL preferences, and version.js; registered both views in app.js and PRECACHE.
  - Server URL source: todos docs/specs/rest-api-spec.md base URL.
  - Theme now stored as JSON under todos.theme.

- [2026-11-04] **[Verify]**
  Size note: 13 counted files and 1162 changed lines, above the large line but under the 1200 cap; the coordinator kept one task.
  - New files: 904 lines across six files.
  - Edits: 258 lines across seven files.

- [2026-11-04] **[Visual]**
  Compared the bin and settings screens at 390 and 1440 px in both themes; fixed compact wrapping.
  - Before: [bin-1440-light-before.png](T0020-build-the-recycle-bin-and-settings-screens-with/screenshots/bin-1440-light-before.png).
  - After: [bin-1440-light-after.png](T0020-build-the-recycle-bin-and-settings-screens-with/screenshots/bin-1440-light-after.png).

- [2026-11-04] **[Review]**
  Agent review approved; the commit was rebuilt on T0018 and T0040 with an identical diff apart from the service worker version.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 15.
  - Lines touched: 1180.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

