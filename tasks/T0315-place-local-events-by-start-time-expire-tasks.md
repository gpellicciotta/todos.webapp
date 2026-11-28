---
id: T0315
owner: ~
needs: [T0314]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0315: Place local events by start time, expire tasks by goal, and filter failed and upcoming tasks

## Goals
Apply the ADR-0006 window rules in the local store, per docs/specs/local-store.md.
Place events by `start-time`, apply the expiry and closing rules by goal, and carry readings.
Filter on `failed`, compute the `upcoming` flag, and cover `failed` in the finished-today filter.
Persist the Show upcoming view option (`TV-14`, `TV-15`).
Rules, files, and tests: [technical-spec.md](T0315-place-local-events-by-start-time-expire-tasks/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read Lifecycle, Overdue Handling, and Queries in local-store.md and the core modules.
- [ ] **[Implement]** Author failing tests for start times, expiry per goal, filters, and the view option.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the rules, the filters, and the preference.
- [ ] **[Verify]**    Run `npm test` and lint and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.
