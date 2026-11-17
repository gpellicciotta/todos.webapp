---
task: T0245
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T02:58:13Z
reviewed_commit: "d3b9f8e"
base_commit: "75635f4"
branch: task/T0245-merge-the-connect-screen-into-the-settings-connection
---
# Review Findings: Task T0245 (Round 1)

## Summary
Rejected for one blocking sign-in lifecycle defect. The merged section and route alias otherwise meet the reviewed goals.

Independent checks passed: 79 affected unit tests, 52 affected browser tests, ESLint, and the service-worker hash check.
Recorded full-suite evidence reports 1570 unit tests and 223 browser tests passing.

## Defects
- Blocking D1: Session notifications discard the sign-in transition before completion handling can preserve its focus and error behavior.
  In `src/js/views/settings.js:568-570`, `justFinished` is computed before a nonlocal session clears `phase`.
  A successful real session synchronously notifies subscribers from `save()` before `complete()` resolves (`src/js/sync/session.js:64-67,139-140`).
  That render changes the live phase from `working` to `signed-in` without focusing an action.
  The promise handler's later render cannot detect the transition, so Sync log never receives the required focus.
  An independent in-memory DOM reproduction emitted the connected notification before resolving the finish promise:

  ```text
  Before: working
  After: signed-in
  Focused element: BODY "AppearanceThemeSystemLightDarkAdding tasksMake Enter addShif"
  Expected focused action: Sync log
  ```

  The same unconditional phase clearing also affects reauthentication from `sign-in-needed`.
  Initial rendering clears `working` immediately; a rejected return then clears `error` or `not-invited` immediately.
  Users keep seeing the expired state instead of the required progress and failure phases.
  The existing success unit test changes session state without notifying subscribers, missing the production sequence.

## Process Gaps
None identified beyond the regression coverage required for D1.

## Required Rework
- Preserve the pending sign-in phase until its promise settles, including when the initial session is expired.
- Preserve failure phases independently of the previous session state.
- Move focus to the first resulting action after successful completion, including synchronous connected notifications.
- Add regression tests emitting the real notification sequence before resolution.
- Add expired-session return tests covering pending, successful, network-error, and not-invited results.
- Rerun affected unit and browser tests and capture their output.
