---
id: T0023
owner: ~
needs: [T0015]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0023: Add a GitHub Pages workflow that tests and publishes the src folder under the app's custom domain

## Goals
Add a GitHub Actions workflow that runs the checks and publishes `src/` to GitHub Pages (`TEC-11`).
Run the workflow only on pushes to main and by hand.
Document the custom domain setup and the release procedure in docs/devops.md.
Pushing and enabling Pages need the user's confirmation; this task prepares them only.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read docs/devops.md and the GitHub Pages documentation for custom domains.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the Pages workflow and the CNAME file.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Document the deployment in docs/devops.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

