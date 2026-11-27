---
id: T0311
owner: ~
needs: [T0309, T0310]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0311: Add a Help screen to the user menu from the help docs, and drop Keyboard shortcuts and About from Settings

## Goals
Add Help to the user menu, opening a `#/help` screen modeled on the Help screen of the Counters app.
Its panels are Application Info & Support, Welcome to ToDo's, Getting Started Tutorial, FAQ, and Release notes.
The middle three come from the `docs/tutorial` Markdown of T0309, and Release notes from `CHANGELOG.md`, both served by T0310.
Settings drops its Keyboard shortcuts and About sections, whose content moves to Help.
Details are in [technical-spec.md](T0311-add-a-help-screen-to-the-user-menu/technical-spec.md).

## Task Execution Steps
- [ ] **[Implement]** Write unit tests for the Markdown renderer, the Help view, the route, the menu, and Settings.
- [ ] **[Implement]** Write wireframe tests and the Help end-to-end tests at 390 and 1440 px.
- [ ] **[Verify]**    Run the new tests and confirm they fail.
- [ ] **[Implement]** Vendor the support.js changelog parser, and add the Markdown renderer and the Help view.
- [ ] **[Implement]** Add the help route and the Help menu item, and drop Shortcuts and About from Settings.
- [ ] **[Implement]** Precache the new modules, bump VERSION, and redraw the wireframes.
- [ ] **[Verify]**    Run `python scripts/devops.py check` and confirm it passes.
- [ ] **[Visual]**    Capture Help and Settings before and after, in light and dark, at 390 and 1440 px.
- [ ] **[Doc]**       Update requirements, ui-design.md, visual-style-guide.md, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Decided]**
  Kept the screen, the Settings removal, specs, and wireframes together: either half alone shows the shortcuts twice or nowhere.

- [2026-11-28] **[Decided]**
  The user chose the GitHub issues link for Report a problem, over an email link.

