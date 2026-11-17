---
id: T0238
owner: "@claude"
session: claude-20261117-6e5e07
needs: []
branch: task/T0238-make-the-compact-layout-shell-e2e-test-wait
worktree: .plan/work/T0238-make-the-compact-layout-shell-e2e-test-wait
status: active
started_at: "2026-11-17T03:35:42Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0238: Make the compact layout shell e2e test wait for the action bar, since full parallel runs fail it

## Goals
Make the shell areas test in `tests/e2e/shell.spec.js` stable under the full parallel e2e run.
Under load it failed with `TypeError: Cannot read properties of null (reading 'y')`, as T0237's validation proof shows.
A `boundingBox()` returns null for an element not yet laid out, so the test reads it too early.
Wait until the action bar, `.app__main`, and the compact `.app__bottom-nav` are visible before measuring them.
Poll the geometry with `expect.poll` or `toPass` rather than adding fixed sleeps.
Completion check: `npx playwright test tests/e2e/shell.spec.js --repeat-each 10` and a full `npx playwright test` pass.
Size estimate: 1 files, 20 lines.

### Declared Files
- tests/e2e/shell.spec.js

## Task Execution Steps
- [x] **[Read]**      Read the shell areas test and the layout start-up in app.js.
- [x] **[Verify]**    Reproduce the null box with a full parallel run or a throttled CPU, and record it.
- [x] **[Implement]** Wait for each measured element and poll the geometry instead of reading it once.
- [x] **[Verify]**    Run the shell spec ten times and the full e2e suite; record the passing output.
- [x] **[Doc]**       Add a CHANGELOG.md entry if the project logs test fixes.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-15] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals and steps from the failure in T0237's validation proof; the test is unchanged since then.

- [2026-11-17] **[Verify]**
  Waited for action bar, main, bottom nav and polled geometry in shell.spec.js; shell x10 (260 passed) and full e2e (224 passed) pass. Null box not reproduced locally.

- [2026-11-17] **[Read]**
  Read the shell areas test; the add-bar/editor test measured boxes once after the first visible check.

- [2026-11-17] **[Implement]**
  Added visibility waits and expect.poll geometry checks for main, action bar, and bottom nav.

- [2026-11-17] **[Doc]**
  Added a Tests bullet under v0.5.1-pre in CHANGELOG.md.

