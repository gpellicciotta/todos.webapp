---
id: T0057
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-07T09:12:13Z"
ended_at: "2026-11-07T10:07:49Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 3
reviewed_by: "@claude-subagent"
completion-commit: f8b63fee5131c6168dd68fccb2ea9896b9689f06
---
# T0057: Add devops.py script just like in other projects

## Goals
Add scripts/devops.py, modeled on the template.python project, with the actions lint, test, e2e, check, release, version, and help.
`release` finalizes the version files and changelog, tags, and pushes after confirmation.
With `--backend-dir`, `release` also commits the todos server's `todosWebappVersion` pin locally; it never pushes or deploys the server.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read template.python's devops.py, _cli_common.py, check-sw-version.mjs, version.js, and docs/devops.md.
- [x] **[Implement]** Author the failing pytest tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Write _cli_common.py and devops.py with the check actions, version, and help.
- [x] **[Implement]** Write the release action: preflight, version files, changelog, service worker, tag, push, and pin.
- [x] **[Verify]**    Run pytest, ruff, and a release in a scratch clone; record the output in validation-proof.md.
- [x] **[Doc]**       Document the script in docs/devops.md and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file written by hand: the plan CLI cannot scaffold a file for an existing task line.

- [2026-11-07] **[Decided]**
  Release mechanics agreed with the user: confirm before any push; pin bump committed locally in the todos repo, no deploy.

- [2026-11-07] **[Implement]**
  Wrote devops.py and _cli_common.py; 31 pytest tests pass, including a scratch release with bare origin and pin.

- [2026-11-07] **[Decided]**
  Exit codes follow the CLI guidelines: 2 means invalid arguments, not a failed release step as in the template.

- [2026-11-07] **[Verify]**
  Ruff reformatted two older files that failed the format check; committed separately, since lint now covers them.
  - scripts/draw-wireframes.py.
  - tests/test_draw_wireframes.py.

- [2026-11-07] **[Verify]**
  Size note: 981 changed lines against 650 estimated; release flow and tests grew, still below the large line.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 5.
  - Lines touched: 981.
  - Reopenings: 0.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 rejected by @claude-subagent: Round 1: push not atomic, edit failures leave a dirty tree, post-push failures unreported; plus minor findings on prompts, exit codes, dry run, tests, docs.

- [2026-11-07] **[Implement]**
  Reworked after review round 1: atomic push, restore on failure, step summary after push, dry run runs checks.
  - 50 pytest tests pass.
  - Real dry run with checks exits 0.

- [2026-11-07] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 2 rejected by @claude-subagent: Round 2: pytest collected work/ worktrees and failed the checks; minor findings on interrupts, empty notes, headings, gh, backend branch, tests.

- [2026-11-07] **[Review]**
  Round 3 requested (mode: agent).

- [2026-11-07] **[Review]**
  Rounds 1 to 3 by independent subagents; round 3 approved commit 9f391ae. Later fixes: interrupt message and its test.

- [2026-11-07] **[Verify]**
  Size note: 1443 changed lines against 650 estimated; review rework added failure paths. Below three times the estimate.

- [2026-11-07] **[Verify]**
  One pwa.spec.js timeout appeared in a full run; it passed alone and on rerun.

- [2026-11-07] **[Review]**
  Round 3 approved by @claude-subagent.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 5.
  - Lines touched: 1443.
  - Reopenings: 0.

- [2026-11-07] **[Complete]**
  Task completed successfully.

