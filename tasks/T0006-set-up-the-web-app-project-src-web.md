---
id: T0006
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
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
- [ ] **[Read]**      Read docs/devops.md, the requirements' technical section, and the JavaScript guidelines.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Add package.json, the lint, test, and Playwright configs, serve.mjs, and a minimal index.html.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Document the npm commands in docs/devops.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

