---
id: T0277
owner: "@claude"
needs: []
branch: task/T0277-replace-the-todos-icons-favicon-and-manifest-icons
worktree: .plan/work/T0277-replace-the-todos-icons-favicon-and-manifest-icons
status: active
started_at: "2026-11-17T18:21:45Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the app icons spec and every icon, favicon, and manifest reference in `src/` and `scripts/`.
- [ ] **[Implement]** Author failing tests for the manifest icons, head links, and service worker precache list.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Copy the icon files, update references, and bump the service worker version and hashes.
- [ ] **[Verify]**    Run `python scripts/devops.py check` and the browser scenario of the technical spec.
- [ ] **[Visual]**    Capture before and after screenshots of the tab, sidebar brand, settings, and gallery.
- [ ] **[Doc]**       Update CHANGELOG.md, the Lucide notice, and any docs that name the old icon files.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Created from the support.webapp app icon set; the user chose flat icons in the app and dimensional install icons.
