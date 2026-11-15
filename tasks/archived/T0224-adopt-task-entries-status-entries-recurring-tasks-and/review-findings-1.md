---
task: T0224
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T00:35:57Z
reviewed_commit: "1970620"
base_commit: "3e003d2"
branch: task/T0224-adopt-task-entries-status-entries-recurring-tasks-and
session: antigravity-20261115-aad8d2
session_agent: antigravity
session_created_at: 2026-11-15T00:19:01Z
---
# Review Findings: Task T0224 (Round 1)

## Summary
The v5 store schema, occurrence event folding, status-to-event mapping, sync push/merge, and Java-backed contract harness are well structured. Lint, `check:sw`, 1221 unit tests, 9 contract tests, and Playwright suites pass. However, five functional defects in note ownership, multi-event rollback, v5 queue migration undo data, recurring rule invariants, and post-disconnect re-adoption require rework before approval.

## Defects
- **D1 — Synced own notes lose Edit/Delete controls and foreign notes render `"You"` (`NOT-2`, `NOT-4`, `CON-8`)**:
  - `src/js/sync/merge.js` (`toNote`, line 149) now stores numeric `owner-id` from `/api/changes` on pulled notes.
  - `src/js/views/notes.js` (line 225) checks `(note['owner-id'] ?? null) === null` without comparing against the connected `userId` already loaded in `src/js/views/task-editor.js` (line 454).
  - Once synced (or on a second device), every own note has a non-null `owner-id`, hiding the Edit/Delete menu; conversely, a pulled note from a deleted account (`revision` set, `owner-id: null`) wrongly shows Edit/Delete.
  - `planDisconnect` (`src/js/sync/merge.js`, lines 486, 488) keeps `owner-id` on kept tasks and notes, leaving synced notes uneditable even after disconnecting to local mode.
  - `src/js/views/notes.js` (line 218) unconditionally renders `STRINGS.you` for collaborator notes (`owner-id !== userId`), and `tests/unit/task-editor.test.js` (lines 244, 263) still uses legacy `{ author: null, 'edit-time': null }` fixtures.
- **D2 — Sequential rollback of multiple queued events or rule edits corrupts `current-occurrence` (`SYN-9`)**:
  - `eventEntries` (`src/js/sync/queue.js`, lines 380-393) records each event's `undo.before` assuming earlier queued events succeed.
  - `queue.undo` / `planUndo` (`src/js/sync/queue.js`, lines 102-105, 515-533) refolds later queued events onto `undo.before` when an event fails, without updating `undo.before` on those remaining `sync-queue` entries.
  - If two or more queued events (or an `update-rules` followed by a `post-event`) are rejected in sequence with `409`/`403`, the later undo restores its stale `undo.before` (e.g., three rejected `complete` ticks on a target-3 task leave `completion-count: 2, status: 'in-progress'` with zero completion events).
- **D3 — Version 5 queue migration drops `undo` state on `post-event` and `update-rules` entries (`SYN-9`)**:
  - `src/js/store/migrate.js` sets `before: null` in `eventEntries` (line 67, despite computing `occurrenceOf(from)` on line 60) and `fields: {}` on migrated `update-rules` entries (line 98, discarding `entry.undo?.fields` for `due-time` and `overdue-handling`).
  - When a migrated `post-event` or `update-rules` entry is rejected by the server, `planUndo` cannot revert `current-occurrence` or `lifecycle-rules`.
- **D4 — Recurring `lifecycle-rules` invariants break on format 1 backup re-import and rule edits (`BAK-14`)**:
  - `toLegacyTask` (`src/js/core/occurrences.js`, line 380) exports recurring tasks with `'overdue-handling': 'keep'`.
  - Re-importing that backup (`toStoreTask` in `src/js/core/backup.js`, lines 422-426) sees `null !== 'keep'` and calls `applyRuleEdit`, which (`src/js/core/occurrences.js`, line 245) only clears `due-time`/`overdue-handling` on a non-recurring-to-recurring transition.
  - That leaves a recurring task with `'overdue-handling': 'keep'`, which `UpdateLifecycleRulesCommand` on `todos.server` rejects with `400 Bad Request` when `importEntries` syncs `update-rules`.
  - `createTask` (`src/js/store/tasks.js`, line 435) similarly retains `DEFAULT_RULES['overdue-handling'] = 'keep'` when creating a task with recurring `lifecycle-rules`.
- **D5 — Disconnecting and later connecting resets tasks whose status came from another device (`CON-8`, `CON-4`)**:
  - Pulled tasks hold no rows in `STORES.events` (`docs/specs/local-store.md`, line 50).
  - `planDisconnect` (`src/js/sync/merge.js`, lines 474-496) keeps owned tasks without synthesizing local events (or clearing `owner-id`) when `STORES.events` has no events for their `current-occurrence`.
  - Connecting later runs `adopt.js`, which posts the task (`ready`, count `0`) and replays zero user events, losing `completed`, `in-progress`, or `cancelled` state.

## Process Gaps
- **P1 — Unapproved file-count overrun**: Final diff touched 58 counted files (2289 lines) against `size_approved: 30 files, 1600 lines` (`1.93x` files, above the `1.5x` ceiling) without pausing for renewed size approval.
- **P2 — Undeclared `CHANGELOG.md` area prefixes**: `CHANGELOG.md` (lines 21-27) introduces `Store:` and `Sync:` prefixes that are neither standard `{{area}}` categories (`FrontEnd`, `BackEnd`, `DevEx`, `Build`, `Docs`, `CLI`, `Config`, `Security`) nor declared in the changelog header, and splits one task's deliverable across nine bullets instead of consolidating by area.

## Required Rework
1. **Fix note ownership and post-disconnect cleanup (`src/js/views/notes.js`, `src/js/views/task-editor.js`, `src/js/sync/merge.js`)**:
   - Pass `userId` (and collaborator name lookup where available from shared lists, or avoid labeling foreign notes `"You"`) from `task-editor.js` into `notes.js`.
   - Show Edit/Delete on a note iff `!readOnly` and either `userId === null` (local mode) or `(note.revision === undefined && note['owner-id'] === null)` or `String(note['owner-id']) === String(userId)`.
   - Clear service `owner-id` to `null` on kept tasks and notes in `planDisconnect`, update the stale note fixtures in `tests/unit/task-editor.test.js`, and add unit tests covering synced own notes (`owner-id === userId`), collaborator notes (`owner-id !== userId`), and deleted-author notes (`revision` set, `owner-id: null`).
2. **Keep `sync-queue` event `undo.before` consistent across sequential rollbacks (`src/js/sync/queue.js`)**:
   - When `queue.undo` / `planUndo` rolls back an `event` or `rules` entry, update `undo.before` on subsequent queued `post-event` entries for the same task as they refold so rejecting multiple queued entries in a row restores the original occurrence.
   - Add unit and push tests where all queued ticks/events (and a rule edit followed by an event) are rejected with `409`/`403`.
3. **Preserve `undo` data in version 5 queue migration (`src/js/store/migrate.js`)**:
   - Populate `undo.before` for each migrated `post-event` entry by stepping `occurrenceOf(from)` through `applyEvent`, and carry `due-time` / `overdue-handling` from `entry.undo?.fields` into migrated `update-rules` `undo.fields`.
   - Assert in `tests/unit/store-db.test.js` that `queue.undo` reverts migrated `post-event` and `update-rules` entries.
4. **Enforce recurring `lifecycle-rules` invariants (`src/js/core/occurrences.js`, `src/js/core/backup.js`, `src/js/store/tasks.js`)**:
   - Ensure `applyRuleEdit` and `createTask` always keep `'due-time': null` and `'overdue-handling': null` whenever `isRecurring(rules)` is `true`, and skip applying format 1's `due-time`/`overdue-handling` in `toStoreTask` when the stored task is recurring.
   - Add unit tests for format 1 export/re-import of a recurring task (including connected `importEntries`) and recurring `createTask` / `applyRuleEdit`.
5. **Preserve task occurrence state across disconnect and re-adoption (`src/js/sync/merge.js`)**:
   - In `planDisconnect`, ensure kept tasks whose `STORES.events` lack events reaching `current-occurrence` synthesize matching local events (and clear `owner-id` to `null`) so a later `adopt` reproduces their status and completion count; add a disconnect-then-adopt test.
6. **Align `CHANGELOG.md` with `change-management-guidelines`**:
   - Use standard `{{area}}` categories (or declare custom categories in `CHANGELOG.md`'s header) and consolidate the task's bullets concisely within the 20-word-per-bullet limit.
