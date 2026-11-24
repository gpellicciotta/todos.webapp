---
id: T0293
owner: "@claude"
needs: []
branch: task/T0293-show-sync-log-entries-as-the-vendored-entry
worktree: .plan/work/T0293-show-sync-log-entries-as-the-vendored-entry
status: active
started_at: "2026-11-24T13:41:16Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0293: Show sync log entries as the vendored entry list cards

## Goals
Render the Sync log screen's entries with the package entry list: `.entry-list` and `.entry-list__item` cards.
Show the entry message first, then chips for the time and the kind, as entry-list.css lays them out.
Keep the item link, the lost, kept, and undone values as copyable text, the intro, the empty state, and the retention note.
Drop the `sync-log-entry` rules of views.css that the package now covers.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [ ] **[Read]**      Read the vendored entry-list.css, its gallery specimen, and the SYN-8 and SYN-9 requirements.
- [ ] **[Implement]** Update the unit and e2e tests of the technical spec for the entry list markup.
- [ ] **[Verify]**    Run them and confirm they fail on main.
- [ ] **[Implement]** Build the entries on the entry list markup and drop the replaced styles.
- [ ] **[Verify]**    Run the completion check and capture before and after screenshots at 390 and 1440 px.
- [ ] **[Doc]**       Update the UI design spec, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.
