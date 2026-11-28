---
id: T0313
owner: "@claude"
needs: []
branch: task/T0313-add-goals-start-times-progress-and-time-spent
worktree: .plan/work/T0313-add-goals-start-times-progress-and-time-spent
status: active
started_at: "2026-11-28T01:07:55Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0313: Add goals, start times, progress, and time spent to local records in database version 6

## Goals
Add the ADR-0006 record fields in IndexedDB version 6, per Store Upgrade in docs/specs/local-store.md.
Rules and occurrences gain the goal fields, `start-time`, `progress`, and `time-spent-seconds`.
Keep behavior unchanged: events stay `complete` and `uncomplete`, and no status changes.
Keep `target-count` and `completion-count` as mirrors of `goal-target` and `progress`, so no reader changes.
T0314 converts events, T0315 adds start times and expiry, and T0316 removes the mirrors.
Rules, files, and tests: [technical-spec.md](T0313-add-goals-start-times-progress-and-time-spent/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read Goals and Store Upgrade in local-store.md, occurrences.js, db.js, and migrate.js.
- [ ] **[Implement]** Author failing tests for the upgrade of rules and occurrences and for the mirrors.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the fields, the upgrade step, and the mirror upkeep.
- [ ] **[Verify]**    Run `npm test` and lint and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.
