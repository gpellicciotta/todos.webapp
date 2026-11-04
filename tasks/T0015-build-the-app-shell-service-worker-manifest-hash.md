---
id: T0015
owner: "@claude-code"
needs: ['T0032', 'T0033']
branch: —
worktree: —
status: active
started_at: "2026-11-04T15:34:29Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the manifest, service worker, router, layout, and app entry point.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the shell differs, docs/devops.md for offline testing, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

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

