# Changelog
All notable changes to this project are documented here.

> See [change management guidelines](https://github.com/gpellicciotta/dev-guidelines/blob/main/guidelines/change-management-guidelines.md)
> for the versioning and changelog conventions used across projects.

## v0.1.1-pre

## v0.1.0 [released: 2026-11-05]
- FrontEnd: Added an offline-first, installable web app that keeps lists, tasks, and notes in the browser.
- FrontEnd: Added All tasks with search, filters, sorting, and an add bar, plus the first-launch empty state.
- FrontEnd: Added the List screen with manual ordering by drag or keyboard and view-only sort orders.
- FrontEnd: Added task and list editors that save on change, with timestamped notes and a 30-day recycle bin.
- FrontEnd: Added overdue handling that cancels overdue tasks set to cancel automatically, also after the app was closed.
- FrontEnd: Added JSON backup export, and import in merge or overwrite mode with a preview of the changes.
- FrontEnd: Added Settings with theme selection, and a connect flow with sign-in and disconnect through the Auth service.
- FrontEnd: Added a monochrome design system with a navy signal color, a danger color, and a visual style gallery.
- FrontEnd: Made long lists fast by rendering only visible rows, so views open within 200 ms throttled.
- Build: Added the npm tooling, a static dev server, and a GitHub Pages workflow with a precache version check.
- Docs: Wrote the requirements, the UI design with wireframes, the visual style guide, and the store and backup specs.
