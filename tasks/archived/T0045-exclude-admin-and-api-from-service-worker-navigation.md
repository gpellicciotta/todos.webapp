---
id: T0045
owner: "@gemini"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-05T11:15:55Z"
ended_at: "2026-11-05T11:16:29Z"
review: none
preview: none
protocol: adhoc
completion-commit: a8f88b39d5f759dbdf9ded164b2dcef58fac233e
---
# T0045: Exclude /admin and /api from service worker navigation fallback and caching

## Goals
Make the service worker leave `/admin` and `/api` alone.
Navigations to `/admin` must never fall back to the app shell, and responses from either path are never cached.
Matching must work at the site root and under the `/todos.webapp/` Pages subpath.
Completion check: `npm test`

## Task Execution Steps
- [x] **[Implement]** Author tests: /admin navigation and /api requests bypass the worker, online and offline.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Skip /admin and /api paths in the fetch handler before any cache lookup.
- [x] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-05] **[Review]**
  Review lowered from agent to none by @gpellicciotta: These should be very minimal tasks.

- [2026-11-05] **[Implement]**
  Tests failed first (8 of 16), then passed after adding the isServerPath check.

- [2026-11-05] **[Verify]**
  npm test, lint, check:sw, and test:e2e all pass.

- [2026-11-05] **[Doc]**
  Updated worker header comment and CHANGELOG.md.

- [2026-11-05] **[Verify]**
  Recorded task outcomes.
  - Files touched: 4.
  - Lines touched: 120.
  - Reopenings: 0.

- [2026-11-05] **[Complete]**
  Task completed successfully.

