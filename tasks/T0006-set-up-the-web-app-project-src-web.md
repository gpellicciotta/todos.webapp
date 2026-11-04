---
id: T0006
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-03T23:16:57Z"
ended_at: "2026-11-04T01:12:42Z"
review: human
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@gpellicciotta"
completion-commit: b9dd5da8570e8d9983bf7a7f002a466ae6b9a894
---
# T0006: Set up the web app project: src web root, npm tooling, ESLint, Vitest, Playwright, and a local static server

## Goals
Create the npm project that every later task builds on, with `src/` as the deployed web root.
Add ESLint with Stroustrup braces, Vitest for unit tests, and Playwright for end-to-end tests.
Add a dependency-free static server script that serves `src/` for development and tests.
Add a minimal `src/index.html` that the app shell task replaces.
Document the commands in docs/devops.md.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read docs/devops.md, the requirements' technical section, and the JavaScript guidelines.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Add package.json, the lint, test, and Playwright configs, serve.mjs, and a minimal index.html.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Document the npm commands in docs/devops.md and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Verify]**
  Red phase: unit suite failed on the missing serve.mjs, and Playwright's web server could not start.

- [2026-11-04] **[Implement]**
  Added package.json, ESLint, Vitest, and Playwright configs, serve.mjs, and a placeholder index.html; all checks pass.
  - 23 unit tests and 2 end-to-end tests pass.

- [2026-11-04] **[Doc]**
  Size note: 437 lines in 12 files pass the typical line; the tooling pieces only merge together.
  - Undeclared files: .gitignore, README.md, CHANGELOG.md.
  - npm audit: 6 moderate advisories in ESLint's minimatch.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 12.
  - Lines touched: 437.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: human).

- [2026-11-04] **[Review]**
  Round 1 approved by @gpellicciotta.

- [2026-11-04] **[Complete]**
  Task completed successfully.

