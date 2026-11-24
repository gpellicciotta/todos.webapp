---
id: T0291
owner: "@claude"
session: claude-20261124-54d329
needs: []
branch: task/T0291-download-the-settings-backup-through-the-vendored-file
worktree: .plan/work/T0291-download-the-settings-backup-through-the-vendored-file
status: active
started_at: "2026-11-24T14:15:03Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 519.9, input: 60, output: 9946, cache_read: 1927992, cache_write: 64974}
review_status: pending
review_round: 1
review_requested_at: "2026-11-24T14:23:53Z"
---
# T0291: Download the Settings backup through the vendored file-download.js helper

## Goals
Replace the hand-built object URL and hidden link in `saveBackup` of [settings.js](../../src/js/views/settings.js) with `downloadJson`.
Keep the file name, the two-space JSON, the `application/json` type, and the confirmation toast.
This refactor changes no behavior.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [x] **[Read]**      Read the vendored file-download.js and the backup tests of the Settings view.
- [x] **[Implement]** Add a unit test that injects the URL API and expects one revoked URL and the backup name.
- [x] **[Verify]**    Run it and confirm it fails while saveBackup ignores the injected URL API.
- [x] **[Implement]** Call downloadJson from saveBackup and precache file-download.js.
- [x] **[Verify]**    Run the completion check.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.

- [2026-11-24] **[Decided]**
  Injected the URL API through a new optional mountSettings url option; the vendored helper adds a trailing newline to the backup JSON.

- [2026-11-24] **[Verify]**
  Test failed first, then passed; devops check exited 0.
  - 1815 unit, 278 e2e, 215 pytest passed.
  - Files touched: 3.
  - Lines touched: 71.
  - Reopenings: 0.

- [2026-11-24] **[Read]**
  Read file-download.js and the Settings tests; file-download.js was already precached.

- [2026-11-24] **[Implement]**
  Added an Export backup unit test and switched saveBackup to downloadJson; bumped the service worker VERSION.

- [2026-11-24] **[Doc]**
  Added a FrontEnd bullet to CHANGELOG.md under v0.5.1-pre.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

