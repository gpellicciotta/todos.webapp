---
id: T0293
owner: "@claude"
session: claude-20261124-480373
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
- [x] **[Read]**      Read the vendored entry-list.css, its gallery specimen, and the SYN-8 and SYN-9 requirements.
- [x] **[Implement]** Update the unit and e2e tests of the technical spec for the entry list markup.
- [x] **[Verify]**    Run them and confirm they fail on main.
- [x] **[Implement]** Build the entries on the entry list markup and drop the replaced styles.
- [x] **[Verify]**    Run the completion check and capture before and after screenshots at 390 and 1440 px.
- [x] **[Doc]**       Update the UI design spec, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.

- [2026-11-24] **[Decided]**
  Message holds the item line; chips hold the clock time and a severity chip naming the kind.
  - Overwritten takes warning; rejected, lost access, and error take danger.
  - Open link ends the chip row; values go in entry-list__details.

- [2026-11-24] **[Verify]**
  Unit and e2e tests failed on main markup, then passed; devops check passed. Evidence and screenshots in validation-proof.md.
  - Before: before-390-light.png, before-1440-dark.png and peers.
  - After: after-390-light.png, after-1440-dark.png and peers.

- [2026-11-24] **[Implement]**
  Touched undeclared src/service-worker.js for the VERSION bump the precache check requires.
  - Mechanical command: node scripts/check-sw-version.mjs --update.
  - Mechanical files: scripts/sw-precache-hashes.json.

- [2026-11-24] **[Doc]**
  Updated ui-design.md, visual-style-guide.md, and CHANGELOG.md. The sync-log.svg wireframe still draws the old card; follow-up task filed.

- [2026-11-24] **[Verify]**
  Recorded task outcomes; T0296 follows up on the wireframe.
  - Files touched: 7.
  - Lines touched: 184.
  - Reopenings: 0.

