---
id: T0291
owner: "@claude"
needs: []
branch: task/T0291-download-the-settings-backup-through-the-vendored-file
worktree: .plan/work/T0291-download-the-settings-backup-through-the-vendored-file
status: active
started_at: "2026-11-24T14:15:03Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0291: Download the Settings backup through the vendored file-download.js helper

## Goals
Replace the hand-built object URL and hidden link in `saveBackup` of [settings.js](../../src/js/views/settings.js) with `downloadJson`.
Keep the file name, the two-space JSON, the `application/json` type, and the confirmation toast.
This refactor changes no behavior.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [ ] **[Read]**      Read the vendored file-download.js and the backup tests of the Settings view.
- [ ] **[Implement]** Add a unit test that injects the URL API and expects one revoked URL and the backup name.
- [ ] **[Verify]**    Run it and confirm it fails while saveBackup ignores the injected URL API.
- [ ] **[Implement]** Call downloadJson from saveBackup and precache file-download.js.
- [ ] **[Verify]**    Run the completion check.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.
