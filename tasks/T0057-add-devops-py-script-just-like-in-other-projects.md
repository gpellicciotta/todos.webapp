---
id: T0057
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0057: Add devops.py script just like in other projects

## Goals
Add scripts/devops.py, modeled on the template.python project, with the actions lint, test, e2e, check, release, version, and help.
`release` finalizes the version files and changelog, tags, and pushes after confirmation.
With `--backend-dir`, `release` also commits the todos server's `todosWebappVersion` pin locally; it never pushes or deploys the server.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read template.python's devops.py, _cli_common.py, check-sw-version.mjs, version.js, and docs/devops.md.
- [ ] **[Implement]** Author the failing pytest tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Write _cli_common.py and devops.py with the check actions, version, and help.
- [ ] **[Implement]** Write the release action: preflight, version files, changelog, service worker, tag, push, and pin.
- [ ] **[Verify]**    Run pytest, ruff, and a release in a scratch clone; record the output in validation-proof.md.
- [ ] **[Doc]**       Document the script in docs/devops.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file written by hand: the plan CLI cannot scaffold a file for an existing task line.

- [2026-11-07] **[Decided]**
  Release mechanics agreed with the user: confirm before any push; pin bump committed locally in the todos repo, no deploy.
