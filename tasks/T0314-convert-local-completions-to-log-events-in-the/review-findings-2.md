---
task: T0314
round: 2
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T01:49:16Z
reviewed_commit: "075bf58"
base_commit: "aa3f6b8"
branch: task/T0314-convert-local-completions-to-log-events-in-the
---
# Review Findings: Task T0314 (Round 2)

## Summary
**[Decided]** Reject: mixed legacy and log histories still rebuild incorrect caches. `npm test` passed 1,897 tests; `npm run lint` passed.

## Defects
- **Blocking — Mixed histories lose log cache data.** `src/js/core/occurrences.js:692` falls back to `refoldOccurrence` whenever an occurrence contains a legacy `complete` or `uncomplete`. That fold preserves existing time and entries instead of rebuilding them. Legacy backup imports retain those events, and subsequent logs create mixed histories. On backup import, a 60-second log alongside a legacy completion rebuilds with zero seconds and no live entries. Queue rejection likewise retains stale time and entries for such histories. A direct `foldLogCache` invocation reproduced this result.

## Process Gaps
- **Non-blocking —** The rework tests were written with the fixes, without recorded failing-first output, as the validation proof states.

## Required Rework
- Rebuild mixed legacy and log histories correctly for backup import and queue rollback. Add regression coverage for surviving time-only logs, live entries, and undos alongside legacy events.
