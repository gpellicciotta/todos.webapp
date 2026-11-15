---
task: T0237
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T13:21:53Z
reviewed_commit: "f785d8c"
base_commit: "4141dfc"
branch: task/T0237-show-task-notes-on-their-occurrence-and-let
session: antigravity-20261115-2ddebf
session_agent: antigravity
session_created_at: 2026-11-15T13:04:59Z
---
# Review Findings: Task T0237 (Round 1)

## Summary
Unit, contract, Playwright, lint, and service-worker checks pass on `f785d8c`. Four functional defects and four process gaps block approval.

## Defects
- In connected mode, `Belongs to` omits past occurrences `1` through `current - 1` and their period labels.
  [task-editor.js](../../../../src/js/views/task-editor.js) reads only `store.occurrencesOfTask`, which stores only `current-occurrence` after `/api/changes` sync.
  [views/notes.js](../../../../src/js/views/notes.js) builds options only from `links.occurrences` and `note.occurrence`, omitting `1 .. links.current` and never loading `/api/tasks/{{task-id}}/occurrences`.

- Own notes on earlier occurrences (`occurrence < current`) become unreachable for editing, unlinking, or deletion, breaking `NOT-4` and `NOT-6`.
  [views/notes.js](../../../../src/js/views/notes.js) hides past-occurrence notes from the thread, while [task-history.js](../../../../src/js/views/task-history.js) renders static text without `Edit` or `Delete`.
  Open history entries in [task-history.js](../../../../src/js/views/task-history.js) also stay stale when notes change until manual refresh.

- `occurrenceAt` in [store/notes.js](../../../../src/js/store/notes.js) scans stored occurrences oldest-first instead of inspecting only the newest occurrence started by `creation-time`.
  After a cancelled occurrence and later shorter recurrence end, notes added after recurrence end link to the earlier occurrence.
  Same-day cancelled and reopened occurrences also match the older occurrence number instead of the newer one.

- `toRequest` in [push.js](../../../../src/js/sync/push.js) drops `entry['edit-times']` from `edit-note` `PUT` bodies, contradicting [queue.js](../../../../src/js/sync/queue.js) and [local-store.md](../../../../docs/specs/local-store.md).

## Process Gaps
- Commit `f785d8c` uses a 22-word commit message, exceeding the 20-word limit.
- Added prose exceeds the 20-word sentence cap in [CHANGELOG.md](../../../../CHANGELOG.md), [requirements.md](../../../../docs/requirements.md), [local-store.md](../../../../docs/specs/local-store.md), and [ui-design.md](../../../../docs/specs/ui-design.md).
- [CHANGELOG.md](../../../../CHANGELOG.md) adds four `FrontEnd:` entries for one task instead of consolidating the user-facing change.
- Measured size reached 22 files without size approval or recording `Mechanical command:` and undeclared files in [technical-spec.md](technical-spec.md).

## Required Rework
- Populate `Belongs to` in [views/notes.js](../../../../src/js/views/notes.js) and [task-editor.js](../../../../src/js/views/task-editor.js) with occurrences `1 .. current`, loading connected period labels from `/api/tasks/{{task-id}}/occurrences`.
- Let users edit, unlink, and delete own notes on past occurrences, and refresh open [task-history.js](../../../../src/js/views/task-history.js) views on note changes.
- Match server `defaultLink` in [store/notes.js](../../../../src/js/store/notes.js) by checking only the newest occurrence with `start-time <= creation-time`.
- Include `'edit-times': times` in `edit-note` request bodies in [push.js](../../../../src/js/sync/push.js), with unit and contract test coverage.
- Consolidate [CHANGELOG.md](../../../../CHANGELOG.md), trim >20-word sentences and commit messages, and update [technical-spec.md](technical-spec.md) (`Mechanical command:` and scope/size approval).
