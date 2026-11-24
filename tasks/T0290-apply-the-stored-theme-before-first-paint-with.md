---
id: T0290
owner: ~
needs: [T0254]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0290: Apply the stored theme before first paint with the vendored theme-boot.js

## Goals
Load the vendored `js/theme-boot.js` as a classic script in the head of index.html, so a stored theme paints first.
Today [app.js](../../src/js/app.js) applies the theme only once the module graph runs, after the first paint.
Store `todos.theme` as plain `light` or `dark`, which theme-boot reads; `readTheme` already accepts both forms.
Add `<meta name="color-scheme">`, which theme-boot updates, as the package's starter index.html does.
Keep `applyTheme` for the `theme-color` metas and live changes from Settings.

## Task Execution Steps
- [ ] **[Read]**      Read the vendored theme-boot.js and the starter template index.html of support.webapp v0.5.1.
- [ ] **[Implement]** Write the unit and e2e tests of the technical spec.
- [ ] **[Verify]**    Run them and confirm they fail on main.
- [ ] **[Implement]** Add the boot script and color-scheme meta, store the theme plain, and precache the script.
- [ ] **[Verify]**    Run the completion check.
- [ ] **[Doc]**       Update the UI design spec and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.
