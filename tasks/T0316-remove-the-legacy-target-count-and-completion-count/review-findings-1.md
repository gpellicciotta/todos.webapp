---
task: T0316
round: 1
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-28T09:36:35Z
reviewed_commit: "e4fe1b6"
base_commit: "9da170f"
branch: task/T0316-remove-the-legacy-target-count-and-completion-count
session: claude-20261128-d49221
session_agent: claude-code
session_created_at: 2026-11-28T09:28:21Z
---
# Review Findings: Task T0316 (Round 1)

## Summary
Approved: the work meets every goal, and the full check passes on the reviewed commit.

- Rules and occurrences no longer hold `target-count` or `completion-count`.
  `DEFAULT_RULES`, `RULE_FIELDS`, `opened`, the in-place fold, rule edits, and the views read `goal-target` and `progress`.
- The legacy names survive in `src` only at the edges:
  - `fullRules`, `fullOccurrence`, and `withGoalTarget` read them.
  - Format 2 backup validation and conversion read them.
  - The v5-to-v6 migration and queued-entry conversion read them.
  - Queue rollbacks of pre-upgrade undo data and older service rows in `occurrenceFromWire` read them.
- `withGoalTarget` lets an existing `goal-target` win, so v6 records from T0313 builds that carry both names read correctly.
- The mirror helpers `mirrorRules` and `mirrorOccurrence` are gone, and so are `rulesFromWire`, `storeEvent`, `renamedDetails`, and `editRulesOfTask`.
  As the Execution Log says, no legacy fold function lost all of its callers.
- The new `tests/unit/goal-fields.test.js` has a recorded red phase for 6 of its 8 tests.
  The renamed tests in other files keep their assertions on the goal fields.
- `docs/specs/local-store.md` and `CHANGELOG.md` describe the change, including the null `progress` for a reading goal without a reading.

Independent verification, `python scripts/devops.py check`, exit 0:
- Service worker version check: OK, 167 files at VERSION `2026-11-28.17`.
- Design system integrity and conformance: PASS.
- Vitest: 75 files, 2164 tests passed. ESLint: clean.
- Playwright: 303 passed.
- Ruff check and format: clean. Pytest: 271 passed.
- `plan tasks validate T0316 --completion`: passed.

## Defects
None.

## Process Gaps
- Non-blocking. Scope ran past the size estimate: 41 files and about 1,189 changed lines, against an estimate of 11 files and 500 lines.
  The Execution Log explains why, and the technical spec lists the undeclared files.
- Non-blocking. `localEventsOf` in `src/js/sync/merge.js` now compares a null `progress` (a reading goal without a reading) with the in-place fold's 0.
  On disconnect, such a task's own user events are deleted and recreated as `start` or `cancel` with new identifiers.
  The resulting status matches the old behavior, and the function's mismatch on non-check goals predates this task.
- Non-blocking. The field names in `tests/contract/sync.contract.test.js` changed but were never run against a todos server build.
  The validation proof states this openly.

## Required Rework
None.
