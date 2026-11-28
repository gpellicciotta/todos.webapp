---
task: T0315
round: 1
verdict: approved
blocking: 0
reviewer: "@gemini"
reviewed_at: 2026-11-28T03:15:42Z
reviewed_commit: "a462262"
base_commit: "5d169ef"
branch: task/T0315-place-local-events-by-start-time-expire-tasks
---
# Review Findings: Task T0315 (Round 1)

## Summary
The work meets the goals. Commit a462262 contains these changes:
- Occurrence 1 starts at the rule's `start-time`, and an upcoming task takes no events.
- Overdue tasks expire by goal, once per occurrence. `fail` and `at-most` tasks close with the verdict from the counts, and an `at-least` task under `keep` stays open.
- `failed` joins the status filter, the group names, and the Finished today filter.
- `isUpcoming` is computed, and the 24 hour window is applied in `filterTasks`.
- `showUpcoming: false` is persisted in the view state (`TV-15`).

I ran the checks on the branch head:
- `npm test`: 71 files and 1963 tests passed.
- `npm run lint`: no errors.
- `npm run check:sw`: OK, 164 files match VERSION 2026-11-28.7.

The diff matches the documented rules in local-store.md. The CHANGELOG entries and the service worker version bump are present. The `validation-proof.md` evidence matches what I reproduced.

## Defects
None.

## Process Gaps
Non-blocking:
- The worker wrote tests after the code, then reverted `src/` to show 29 failures. The guideline asks for failing tests first. The proof file discloses this, so the evidence is honest.
- The spec's Declared Files list `overdue.js`, `preferences.js`, and `preferences.test.js`, which the diff does not touch. The diff touches about 11 undeclared files, including views, other tests, and the service worker. The diff has 413 added lines in 20 files against an estimate of 600 lines in 9 files. The extra files are small, consistent follow-ups, such as the `failed` label and the `cancel` to `fail` editor mapping. The declared list should have been updated.
- `npm run test:e2e` was not run, as the proof states. The integration scenario is a unit test over the real store.
- Show upcoming has no visible control yet. The log defers it, and the option lives in the view state.

## Required Rework
None.
