# Changelog
All notable changes to this project are documented here.

> See [change management guidelines](https://github.com/gpellicciotta/dev-guidelines/blob/main/guidelines/change-management-guidelines.md)
> for the versioning and changelog conventions used across projects.

## v0.1.0-pre
- Feature: Added the Lists overview and the list editor panel with name, description, details, and delete.
- Feature: Added the Export backup button and the Import backup dialog with mode choice, counts, and confirmation.
- Feature: Added the List screen with manual ordering, order buttons, drag and keyboard moves, and the status filter.
- Feature: Added the Recycle bin and Settings screens with theme selection and the local connection card.
- Feature: Added the notes thread to the task editor, with the add field on top and notes newest first.
- Feature: Added the task editor panel with description, status, due time, overdue behavior, lists, and delete.
- Feature: Added the All tasks screen with search, filters, sort, the add bar, the status menu, and the empty state.
- Feature: Added the task view controls with search, filter chips, sort, and per-device preferences.
- Feature: Added the shared task list rows and the add bar for the task screens.
- Feature: Applied review follow-ups to the store, toasts, shell, and task row styles.
- Build: Added a GitHub Pages workflow that tests and publishes src, and a service worker version check.
- Feature: Made the app an installable offline PWA with a manifest, app icons, and a versioned service worker precache.
- Feature: Added the app shell with the hash router, compact and wide layouts, navigation, and app start-up.
- Feature: Applied design system review follow-ups: nav item edge, token math, sync dot ring, live region class, and toast Undo.
- Feature: Handled IndexedDB version changes and blocked upgrades, and added change subscriptions to the store.
- Feature: Added accessible dialog, toast, and live region behavior modules with focus handling.
- Feature: Added accessible menu and popover behavior modules with keyboard and focus handling.
- Feature: Added the app chrome components: navigation, sync indicator, editor panel, note thread, and empty state.
- Feature: Added the task row, status button, and status menu components and the icon sprite to the design system.
- Feature: Defined the JSON backup format and added export, and import in merge and overwrite modes with a preview.
- Feature: Added the task query functions for the filters, search, and sorting of All tasks and the list view.
- Feature: Added the basic control components with every state and their visual style gallery sections.
- Feature: Added per-list manual ordering with fractional-index positions compatible with the service.
- Feature: Added overdue handling and the recycle bin with restore, permanent delete, and the 30-day purge.
- Feature: Added the design tokens, the self-hosted Inter font, and the visual style gallery's token sections.
- Feature: Added timestamped task notes to the local store, newest first, updating each task's last activity time.
- Feature: Added the IndexedDB store for lists, tasks, and memberships, with UUIDv7 identifiers and validation.
- Build: Added the npm project with ESLint, Vitest, Playwright, and a dependency-free static server for src.
- Docs: Moved the list editor and sharing into the editor panel, added a status menu, and ordered notes newest first.
- Docs: Added low-fidelity wireframes for every screen, drawn by a tested script at phone and desktop widths.
- Docs: Designed the UI screens, navigation, and key flows, and a new monochrome design system.
- Docs: Wrote the functional and technical requirements for local and connected modes.
- Build: Created the repository with standard project files and a plan branch store.
