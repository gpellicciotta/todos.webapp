---
task: T0305
round: 2
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T06:02:13Z
reviewed_commit: "c0071c2"
base_commit: "3623737"
branch: task/T0305-export-adr-0006-fields-in-backup-format-3
---
# Review Findings: Task T0305 (Round 2)

## Summary
The limit prevents the extreme loop, but silently loses valid backup progress.

## Defects
- **Blocking:** `src/js/core/backup.js:1229` adds no checks when the missing progress exceeds 32,767. A valid backup with 32,768 missing checks imports with progress zero instead of 32,768. Completion status can also change, and a subsequent export permanently loses the backed-up progress. The original specification requires reconstruction of missing progress and permits these values. Changing the specification in this commit does not resolve that unmet requirement.

## Process Gaps
None.

## Required Rework
- Preserve valid missing progress and status without unbounded reconstruction, and add a regression asserting the imported values above the cutoff.
- If preserving that range cannot be implemented, obtain a human decision on an explicit bounded representation or validation limit and its data-loss implications.
- Rerun the affected tests and checks.

Verification: 129 backup unit tests passed; ESLint and the service worker precache check passed.