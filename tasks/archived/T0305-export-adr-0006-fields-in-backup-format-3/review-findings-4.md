---
task: T0305
round: 4
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-28T09:01:11Z
reviewed_commit: "5291136"
base_commit: "dfc050a"
branch: task/T0305-export-adr-0006-fields-in-backup-format-3
session: claude-20261128-b935e4
session_agent: claude-code
session_created_at: 2026-11-28T08:58:11Z
---
# Review Findings: Task T0305 (Round 4)

## Summary
Round 3 rework meets the user's recorded decision; both round 3 blocking defects are resolved.
- Human decision: the execution log records the user's 2026-11-28 choice (option A, 10,000 cap), which also sits in the Goals.
- Cap: `MISSING_CHECKS_MAX` is 10,000 per occurrence in `missingLogEvents` (format 3) and `missingEvents` (format 2).
  A larger gap adds no checks and is reported as `{task-id, missing}`; everything else still imports.
- Dialog: `showWarning` names each affected task and its missing count, in the preview and after Import.
  Import then stays open on Done instead of closing to a short-lived toast.
- Docs: backup-format.md, ui-design.md, and CHANGELOG.md state the limit and the dialog report.
- Tests: unit boundaries cover 10,000 vs 10,001 for formats 2 and 3, plus two dialog unit tests and one end-to-end test.

Verification, run on 5291136:
- `npx vitest run`: 74 files, 2156 tests passed.
- `npx eslint .`: exit 0, no output.
- `npx playwright test tests/e2e/backup.spec.js`: 13 passed, including the new 10,000-check dialog test.
- `npm run check:sw`: exit 1, inherited from the base commit (see Process Gaps).

## Defects
None.

## Process Gaps
- **Non-blocking:** `npm run check:sw` fails on the branch for 9 files the branch does not touch.
  The files are `index.html`, `css/app-components.css`, `img/icons.svg`, `js/core/query.js`, and five `js/views/*` files.
  The same check fails on base `dfc050a` (VERSION 2026-11-28.12) with the same 9 files.
  The base commit changed them without refreshing `scripts/sw-precache-hashes.json`.
  The orchestrator rebased this branch onto `dfc050a` at 09:58:10, after the round 3 commit at 09:57:52.
  So the proof's `OK ... VERSION 2026-11-28.16` was true before the rebase and is not false evidence.
  Before merge, run `node scripts/check-sw-version.mjs --update`. VERSION .16 already differs from main's .12, so no new bump is needed.
- **Non-blocking:** `unrebuiltProgress` comes from the backup's own events only.
  In merge mode, local events may already hold the missing checks, so the dialog can warn about progress the store actually has.
  Format 2 also reports converted tasks that import later skips (locked or binned). Both only over-warn and lose no data.

## Required Rework
None.
