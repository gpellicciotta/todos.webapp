---
task: T0235
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T11:25:38Z
reviewed_commit: "4408ee1"
base_commit: "ef8a453"
branch: task/T0235-support-recurring-tasks-in-the-web-app-with
session: antigravity-20261115-b303ad
session_agent: antigravity
session_created_at: 2026-11-15T11:11:58Z
---
# Review Findings: Task T0235 (Round 1)

## Summary
Period math, local roll-over, the recurrence editor, history, unit tests, e2e tests, and contract tests pass.
However, four functional defects in the display rule, ended-recurrence actions, recurring refolds, and queue undo require rework.
One modified specification file also fails `lint-markdown check`.

## Defects
- **Display rule (`REC-4`) is bypassed by filters, status grouping, sorting, open counts, and minute ticks.**
  - [all-tasks.js](../../../../src/js/views/all-tasks.js) and [list.js](../../../../src/js/views/list.js) run [query.js](../../../../src/js/core/query.js) filters before [task-list.js](../../../../src/js/views/task-list.js) calls `displayTask`.
  - Connected recurring tasks completed or cancelled in the ended period stay hidden under the default open filter.
  - Status grouping places stale completed tasks under `Completed` while rendering their rows as `To do` (`0/target`).
  - [list-counts.js](../../../../src/js/core/list-counts.js) omits stale completed recurring tasks from open counts, and minute timers never bring them into filtered views.
  - [task-editor.js](../../../../src/js/views/task-editor.js) calls `displayTask(task, Date.now())` directly instead of using an injectable `now` clock.
- **Recurring series ended as `completed` cannot reopen from the UI, and closed current series accept non-`reopen` events.**
  - Server rules allow `reopen` after `end-recurrence` whether the final occurrence ended `completed` or `cancelled`, refusing other events.
  - `applyEvent` in [occurrences.js](../../../../src/js/core/occurrences.js) refuses `reopen` unless `status === 'cancelled'`, hiding `Reopen` in [task-editor.js](../../../../src/js/views/task-editor.js) and [task-list.js](../../../../src/js/views/task-list.js).
  - Both views instead offer `Uncomplete` and `Cancel` on `completed` ended recurrences, which fail `409` on the server.
  - Locally, `postEvent` in [tasks.js](../../../../src/js/store/tasks.js) accepts `uncomplete` and `cancel` on an ended `completed` series, reopening its expired period.
- **Recurring occurrence refolds ignore `isPeriodEnd`, leaving dead code and breaking boundary-time folds.**
  - [occurrences.js](../../../../src/js/core/occurrences.js) exports `isPeriodEnd` but never calls it in `foldEvents` or `refoldOccurrence`.
  - Unlike server `TaskOccurrence.fold`, period-end events do not sort last when timestamps tie or arrive out of order.
- **Queue undo corrupts `current-occurrence` after rejected grace completions, stale-period events, or recurring reopens.**
  - In [queue.js](../../../../src/js/sync/queue.js), `describe` and `planUndo` assume every `postEvent` mutates the same `current-occurrence` in place.
  - Undoing a rejected `postForPrevious` grace event overwrites `current-occurrence`, wiping progress recorded in the active period.
  - Undoing a rejected stale-period event or recurring `reopen` keeps the new occurrence's dates while copying old counts and `close-time`.

## Process Gaps
- **Markdown lint failure on modified documentation.**
  - `lint-markdown check` fails with two `MD019` errors on [local-store.md](../../../../docs/specs/local-store.md) line 148 for unlinked repository file paths.
  - Line 158 of [local-store.md](../../../../docs/specs/local-store.md) also names `overdue.js` in prose without a Markdown link.
- **Task size exceeded the large-task threshold without size approval.**
  - `plan tasks status T0235 --verbose` measures 22 files and 1274 lines (estimated 12 files, 950 lines, not approved).

## Required Rework
- Apply the display rule (`REC-4`) across filtering, status sorting/grouping, open counts, minute ticks, and an injectable editor clock.
  - Update [local-store.md](../../../../docs/specs/local-store.md) Display Rule notes to match the corrected behavior.
- Match server preconditions for closed current recurring occurrences in [occurrences.js](../../../../src/js/core/occurrences.js), [tasks.js](../../../../src/js/store/tasks.js), [task-list.js](../../../../src/js/views/task-list.js), and [task-editor.js](../../../../src/js/views/task-editor.js):
  - Offer and accept `reopen` on any closed current recurring occurrence (`completed` or `cancelled`), while preserving grace `postForPrevious` events.
  - Refuse non-`reopen` user events on closed current recurring occurrences in `postEvent` and hide their UI buttons.
- Sort `isPeriodEnd` events last when folding recurring occurrences in [occurrences.js](../../../../src/js/core/occurrences.js), matching server `TaskOccurrence.fold`.
- Fix [queue.js](../../../../src/js/sync/queue.js) `postEvent` tracking and `planUndo`:
  - Keep `current-occurrence` untouched when undoing a `postForPrevious` grace event.
  - Restore the full `undo.before` occurrence when undoing a stale-period event or recurring `reopen`.
- Format repository file references on lines 148 and 158 of [local-store.md](../../../../docs/specs/local-store.md) as Markdown links.
- Add regression tests for all four defects and pass Markdown lint, JS lint, SW check, and test suites.
