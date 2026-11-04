# Changelog
All notable changes to this project are documented here.

> See [change management guidelines](https://github.com/gpellicciotta/dev-guidelines/blob/main/guidelines/change-management-guidelines.md)
> for the versioning and changelog conventions used across projects.

## v0.1.0-pre
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
