---
id: T0062
owner: ~
needs: [T0058]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0062: Activate a new service worker only after an Update toast click, and survive blocked database upgrades

## Goals
Make a new service worker wait until the user clicks Update on a toast, instead of calling `skipWaiting()` on install.
Show the Update toast for a waiting worker, reload once after it activates, and keep the app usable if the toast is ignored.
Handle a blocked database upgrade: an old tab closes its connection on `versionchange` and shows the reload banner.
This lets the sync tasks migrate the store to version 4 safely.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read service-worker.js, app.js, db.js, devops.md's Service Worker Updates, and the Toasts and Banners design.
- [ ] **[Implement]** Write the failing unit and end-to-end tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Add the waiting state, the Update toast, the one-time reload, and the versionchange handling.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots of the Update toast at 390 and 1440 px, light and dark.
- [ ] **[Doc]**       Update devops.md, ui-design.md, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Created from the sync design review: the version 4 store migration needs controlled service worker updates.
