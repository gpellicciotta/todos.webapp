---
id: T0211
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-08T11:03:19Z"
ended_at: "2026-11-08T13:08:55Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@gpellicciotta"
completion-commit: 1cc2af7b6fffc230deea6b6acd4072ae74a651ee
---
# T0211: Make the service worker reject HTML served for asset files, at install and at fetch

## Goals
The server answers an unknown asset path with `index.html` and status 200. The worker can then cache HTML as CSS and serve it cache first, so refreshing never heals an unstyled app.
- Fail the install when a precached non-HTML file returns a non-OK status or an HTML content type.
- Skip a cached HTML response for a non-navigation request and fetch from the network instead.
Completion check: `npm test && npm run lint && npm run check:sw`
Size estimate: 4 files, 90 lines

## Task Execution Steps
- [x] **[Implement]** Author failing unit tests for install validation and the cached-HTML bypass.
- [x] **[Verify]**    Run the new tests and confirm they fail.
- [x] **[Implement]** Validate responses at install and bypass cached HTML for asset requests at fetch.
- [x] **[Implement]** Bump VERSION and rewrite the precache hash manifest.
- [x] **[Verify]**    Run unit tests, lint, check:sw, and the service worker e2e spec.
- [x] **[Doc]**       Update docs/devops.md and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-08] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Implement]**
  Implemented install validation and cached-HTML bypass; bumped VERSION to 2026-11-08.12.

- [2026-11-08] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-08] **[Review]**
  Agent review found start-page bypass and partial-cache gaps; fixed both, added tests, reworded docs.

- [2026-11-08] **[Review]**
  Round 1 approved by @gpellicciotta.

- [2026-11-08] **[Verify]**
  Recorded task outcomes.
  - Files touched: 5.
  - Lines touched: 205.
  - Reopenings: 0.

- [2026-11-08] **[Complete]**
  Task completed successfully.

