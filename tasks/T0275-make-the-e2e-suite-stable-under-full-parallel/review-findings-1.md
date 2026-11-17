---
task: T0275
round: 1
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-17T21:25:04Z
reviewed_commit: "f374c06"
base_commit: "1f078f6"
branch: task/T0275-make-the-e2e-suite-stable-under-full-parallel
---
# Review Findings: Task T0275 (Round 1)

## Summary
Approved. Both named flakes now wait deterministically, each for its real cause:
- `all-tasks.spec.js:731`: this was line 591 at T0267 (checked with `git show 2f06a06`).
  - The `task-row--added` highlight is a 2000 ms `setTimeout` (`task-list.js:1200`).
  - A paused Playwright clock now holds the highlight on.
  - Waiting for the field to clear stops the next item from being lost.
  - A new `runFor(2_000)` assertion checks that the highlight still clears.
- `sidebar-find.spec.js:43`: now waits for the `11 of 20` count.
  - That covers both the find debounce and the seeded lists still arriving.
- The extra fixes are logged under `[Decided]` with the undeclared files named:
  - `serve.test.js` now waits for the pid content.
  - `sharing.spec.js` now uses the exact `Family actions` name.
  - The service worker VERSION bump fixes the check that failed on main.

Reviewer verification:
- `npx playwright test tests/e2e/all-tasks.spec.js:731 tests/e2e/sidebar-find.spec.js:43 tests/e2e/sharing.spec.js:127 --repeat-each 30 --workers 16`: 90 passed.
- `python scripts/devops.py check` on f374c06: exit 0.
  - 1755 unit, 272 e2e, and 189 pytest passed.
  - The precache VERSION check passed.
- Evidence in `validation-proof.md` matches what I saw. Its file and line counts match the diff, excluding the mechanical and CHANGELOG files.

## Defects
None.

## Process Gaps
- Non-blocking: the scope grew from 2 files to 5 non-mechanical files. The `[Decided]` entries log and justify this.
- Non-blocking: the goal text cites `all-tasks.spec.js:591`, which is now line 731. Only the task file is stale; the work targets the right test.

## Required Rework
None.
