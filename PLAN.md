# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [ ] T0039 Add switchable accent candidates and a red danger color for errors to the design tokens and gallery.
- [x] T0005 Draw a low-fidelity SVG wireframe per screen of docs/specs/ui-design.md, showing 390 px and 1440 px side by side.
- [x] T0001 Write the functional and technical requirements for the offline-first web app in docs/requirements.md.
- [x] T0002 Design the UI: screens, navigation, key flows, wireframes, and the visual style guide.

## Backlog
- [ ] T0004 Show service broadcasts and the notification inbox while connected.
- [ ] T0003 Support several accounts or servers on one device, each with its own data set and sync state.

## v0.1.0
- [x] T0006 Set up the web app project: src web root, npm tooling, ESLint, Vitest, Playwright, and a local static server.
- [x] T0007 Build the design tokens, self-hosted Inter font faces, the style.css entry point, and the gallery token sections.
- [x] T0008 Build the basic control components with every state, and their gallery sections.
- [x] T0009 Build the app components with every state, and their gallery sections: task row, status button, navigation, and more.
- [x] T0010 Build accessible menu, popover, dialog, and toast behavior modules with keyboard and focus handling.
- [x] T0011 Build the IndexedDB data store for lists, tasks, and memberships, with UUIDv7 identifiers and validation.
- [x] T0012 Add timestamped task notes to the data store, updating each task's last activity time.
- [x] T0013 Add fractional-index manual ordering per list, and the task query functions for filters and sorting.
- [x] T0014 Add overdue handling and the recycle bin with restore, permanent delete, and the 30-day purge.
- [x] T0015 Build the app shell: service worker, manifest, hash router, compact and wide layouts, and navigation.
- [x] T0016 Build the All tasks screen with search, filters, sort, the add bar, the status menu, and the empty state.
- [x] T0017 Build the List screen with manual ordering, order buttons, drag and keyboard moves, and the status filter.
- [x] T0018 Build the task editor panel with description, status, due time, overdue behavior, lists, notes, and delete.
- [x] T0019 Build the Lists overview and the list editor panel with name, description, details, and delete.
- [x] T0020 Build the Recycle bin and Settings screens with theme selection and the local connection card.
- [x] T0021 Define the JSON backup file format and implement export, and import in merge and overwrite modes.
- [x] T0022 Add the Export backup button and the Import backup dialog with mode choice, counts, and confirmation.
- [x] T0023 Add a GitHub Pages workflow that tests and publishes the src folder under the app's custom domain.
- [x] T0024 Add the connect flow: Auth sign-in, session token handling, server URL setting, and disconnect.
- [ ] T0025 Build sync upload: the change queue, first-connect adoption of local data, and rollback of rejected changes.
- [ ] T0026 [needs: T0025] Build sync download: the change feed client, per-field merge, lost access handling, and the sync log store.
- [ ] T0027 [needs: T0026] Show every sync state in the sync indicator and build the Sync log screen.
- [ ] T0028 [needs: T0026] Add the Sharing section to the list editor, role-aware controls, and the Shared filter.
- [x] T0029 Add the task query functions for the filters, search, and sorting of All tasks and the list view.
- [x] T0030 Build accessible dialog, toast, and live region behavior modules with focus handling, split from T0010 for size.
- [x] T0031 Build the app chrome components and gallery sections: navigation, sync indicator, editor panel, note thread, and empty state.
- [x] T0032 Handle IndexedDB version changes and blocked upgrades, and add change subscriptions to the store facade.
- [x] T0033 Apply design system review follow-ups: nav item edge, token math, sync dot ring, live region class, toast hold and Undo.
- [x] T0034 Make the app an installable offline PWA: manifest, app icons, versioned service worker precache, and offline tests.
- [x] T0035 Apply the review follow-ups from T0009, T0015, T0032, and T0033 to the store, toasts, shell, and task row styles.
- [x] T0036 Build the shared task list rows and the add bar for the task screens.
- [x] T0037 Build the task view controls: search, filter chips with popovers, the sort menu, and per-device preferences.
- [x] T0038 Keep the task screens fast with 5000 tasks: keyed row reuse, debounced search, and due chip updates.
- [x] T0040 Add the notes thread to the task editor: add field on top, newest first, edit and delete own notes.
- [ ] T0041 Fix the open minor review findings in the screens and editors: focus, ARIA, dialogs, saves, drag, and test timing.
- [ ] T0042 Meet TEC-16 on phones: virtualize long task lists and verify 200 ms first paint under 4x CPU throttling.
