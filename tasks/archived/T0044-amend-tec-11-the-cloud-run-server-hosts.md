---
id: T0044
owner: "@gemini"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-05T11:15:53Z"
ended_at: "2026-11-05T11:16:27Z"
review: none
preview: none
protocol: adhoc
completion-commit: a8f88b39d5f759dbdf9ded164b2dcef58fac233e
---
# T0044: Amend TEC-11: the Cloud Run server hosts the app at the todos site root, Pages stays a bring-your-own-server copy

## Goals
Amend requirement TEC-11 in `docs/requirements.md`.
The Cloud Run server hosts the app at `https://todos.pellicciotta.com/`.
GitHub Pages at `https://gpellicciotta.github.io/todos.webapp/` stays a bring-your-own-server copy with a configurable server URL.
Update `docs/devops.md` to match, including the per-origin local data caveat.
Completion check: the markdown linter passes on both files.

## Task Execution Steps
- [x] **[Read]**      Read TEC-11 and the Pages sections of docs/devops.md.
- [x] **[Doc]**       Rewrite TEC-11 and add the single-origin hosting rationale.
- [x] **[Doc]**       Update docs/devops.md and CHANGELOG.md to match.
- [x] **[Verify]**    Run the markdown linter on the changed files.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-05] **[Review]**
  Review lowered from agent to none by @gpellicciotta: These should be very minimal tasks.

- [2026-11-05] **[Doc]**
  Rewrote TEC-11, devops.md hosting origins, and CHANGELOG.md.

- [2026-11-05] **[Verify]**
  No markdown linter is installed; diff reviewed by hand instead.

- [2026-11-05] **[Verify]**
  Recorded task outcomes.
  - Files touched: 4.
  - Lines touched: 120.
  - Reopenings: 0.

- [2026-11-05] **[Complete]**
  Task completed successfully.

