---
id: T0277
owner: "@claude"
session: claude-20261117-7c37a7
needs: []
branch: task/T0277-replace-the-todos-icons-favicon-and-manifest-icons
worktree: .plan/work/T0277-replace-the-todos-icons-favicon-and-manifest-icons
status: active
started_at: "2026-11-17T18:21:45Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 897.3, input: 122, output: 32372, cache_read: 6009199, cache_write: 107995}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T18:36:53Z"
---
# T0277: Replace the todos icons, favicon, and manifest icons with the shared support.webapp hexagon icon set

## Goals
Adopt the shared todos hexagon icon, following the support.webapp [app icons spec](https://github.com/gpellicciotta/support.webapp/blob/main/docs/specs/app-icons.md).
Use `blue-flat` for the favicon, the sidebar brand, the settings logo, notifications, and the gallery demo.
Use `blue-dimensional` for the apple touch icon and the manifest's `any` and `maskable` icons.
Adopt the shared file names, add `src/favicon.ico`, and remove the `app-icon` files and `render-app-icons.mjs`.
Keep the Lucide ISC notice in the SVG and add it to the repository's notices, since PNG copies cannot carry it.
Copy the files from support.webapp `src/img/app-icons/` at release v0.1.1 or later, and record the tag in the log.
todos.server T0267 then points its admin favicon and mail logos at these files.

## Task Execution Steps
- [x] **[Read]**      Read the app icons spec and every icon, favicon, and manifest reference in `src/` and `scripts/`.
- [x] **[Implement]** Author failing tests for the manifest icons, head links, and service worker precache list.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Copy the icon files, update references, and bump the service worker version and hashes.
- [x] **[Verify]**    Run `python scripts/devops.py check` and the browser scenario of the technical spec.
- [x] **[Visual]**    Capture before and after screenshots of the tab, sidebar brand, settings, and gallery.
- [x] **[Doc]**       Update CHANGELOG.md, the Lucide notice, and any docs that name the old icon files.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Created from the support.webapp app icon set; the user chose flat icons in the app and dimensional install icons.

- [2026-11-17] **[Read]**
  Copied the todos icons from support.webapp tag v0.2.0, the first tag after v0.1.0; every file matches its tag blob.

- [2026-11-17] **[Decided]**
  Added NOTICE.md for the Lucide ISC notice instead of editing LICENSE.md, so GitHub still detects the MIT license.

- [2026-11-17] **[Verify]**
  New unit and e2e tests pass; devops check fails only on e2e, Ruff, and pytest failures that also fail on main.
  - T0282 tracks the 3 e2e failures.
  - Created T0284 for Ruff and T0285 for test_devops.
  - Proof: validation-proof.md.

- [2026-11-17] **[Visual]**
  Captured before and after screenshots of the icons, sidebar brand, settings, compact layout, and gallery; see validation-proof.md.

- [2026-11-17] **[Implement]**
  Size note: 11 counted files and 86 lines cross the typical line; docs, the e2e scenario, and a test URL add files.
  - Files touched: 11.
  - Lines touched: 86.
  - Reopenings: 0.

- [2026-11-17] **[Visual]**
  Screenshots: [before icons](T0277-replace-the-todos-icons-favicon-and-manifest-icons/before-icons.png), [after icons](T0277-replace-the-todos-icons-favicon-and-manifest-icons/after-icons.png), [after sidebar](T0277-replace-the-todos-icons-favicon-and-manifest-icons/after-sidebar-light.png).

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

