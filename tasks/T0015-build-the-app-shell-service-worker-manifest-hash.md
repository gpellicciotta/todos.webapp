---
id: T0015
owner: ~
needs: ['T0009', 'T0010', 'T0030']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0015: Build the app shell: service worker, manifest, hash router, compact and wide layouts, and navigation

## Goals
Make the app an installable PWA that starts and runs offline (`TEC-1`).
Add the hash router with the routes of docs/specs/ui-design.md, restoring scroll position per route.
Render the compact layout with top and bottom bars, and the wide layout with sidebar and editor panel slot.
Apply the theme setting through `data-theme`, following the system by default.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's Layout and Navigation section and the shell wireframes.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
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

