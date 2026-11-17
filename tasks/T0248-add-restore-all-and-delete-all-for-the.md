---
id: T0248
owner: "@claude"
session: claude-20261117-42dbcb
needs: []
branch: task/T0248-add-restore-all-and-delete-all-for-the
worktree: .plan/work/T0248-add-restore-all-and-delete-all-for-the
status: active
started_at: "2026-11-17T02:18:23Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 1140.6, input: 100, output: 33000, cache_read: 5981792, cache_write: 122434}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T02:37:37Z"
---
# T0248: Add Restore all and Delete all for the entries matching the Recycle Bin filter

## Goals
Let users act on every entry that matches the Recycle Bin filter at once.
- While the filter narrows the bin, Restore {{n}} and Delete {{n}} permanently replace Empty recycle bin.
- Delete asks in place first, like Empty recycle bin; Restore needs no question.
- Each action runs in one store transaction and reports the result in a toast.
- Rules and tests: [technical-spec.md](T0248-add-restore-all-and-delete-all-for-the/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the T0247 filter, the bin store functions, and Empty recycle bin in recycle-bin.js.
- [x] **[Doc]**       Add BIN-9 and update the Recycle Bin design and the local store spec.
- [x] **[Implement]** Author failing unit tests for the bulk store calls, the toolbar, the question, and the toasts.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the bulk store calls and the filtered toolbar.
- [x] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [x] **[Visual]**    Capture the filtered toolbar and its question in light and dark themes.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request to act on filter matches.

- [2026-11-17] **[Implement]**
  Added restoreEntries, purgeEntries, and the filtered toolbar; touched queue.js, views.css, and service-worker.js beyond the declared files.
  - Size note: queue sync entries and spacing needed them.

- [2026-11-17] **[Verify]**
  Unit, lint, and e2e suites pass; proof and light and dark screenshots recorded.

- [2026-11-17] **[Verify]**
  Size note: crossed the typical line; the store calls, toolbar, and tests cannot merge apart.
  - Files touched: 13.
  - Lines touched: 520.
  - Reopenings: 0.

- [2026-11-17] **[Read]**
  Read the T0247 filter, bin store functions, and Empty recycle bin in recycle-bin.js.

- [2026-11-17] **[Doc]**
  Added BIN-9 and updated the requirements, UI design, and local store spec.

- [2026-11-17] **[Verify]**
  Failing tests proved first: 19 failed for missing store calls and toolbar buttons.

- [2026-11-17] **[Visual]**
  Captured the filtered toolbar and question in light and dark, plus a before shot.

- [2026-11-17] **[Doc]**
  Added the CHANGELOG entry and bumped the service worker VERSION with its hash manifest.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

## Screenshots
- Before: [filtered-toolbar-before-light.png](T0248-add-restore-all-and-delete-all-for-the/filtered-toolbar-before-light.png)
- After toolbar, light: [filtered-toolbar-after-light.png](T0248-add-restore-all-and-delete-all-for-the/filtered-toolbar-after-light.png)
- After toolbar, dark: [filtered-toolbar-after-dark.png](T0248-add-restore-all-and-delete-all-for-the/filtered-toolbar-after-dark.png)
- After question, light: [filtered-question-after-light.png](T0248-add-restore-all-and-delete-all-for-the/filtered-question-after-light.png)
- After question, dark: [filtered-question-after-dark.png](T0248-add-restore-all-and-delete-all-for-the/filtered-question-after-dark.png)

