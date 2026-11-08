## Technical Specifications

### Decisions
- **[Decided]** The indicator renders the seven engine states of T0026: Local only, Synced, Syncing, Offline, Sign in needed, Sync error, and Update required (`SYN-11`).
- **[Decided]** Update required names the minimum version from the `Upgrade` header and offers Check for update, which calls `registration.update()`; the Update toast of T0062 then appears.
- **[Decided]** Sync now asks the engine for an immediate poll and queue replay; Retry does the same after an error.

### To Decide in This Task
- Where the indicator sits: beside the user button in the top bar, or as a badge on the user button. The shell holds none today.
  Record the choice as `**[Decided]**` in ui-design.md and redraw the shell wireframes.

### Declared Files
- src/js/views/sync-indicator.js
- src/js/views/sync-log.js
- src/js/ui/layout.js
- src/js/app.js
- src/js/strings.js
- src/css/app-components.css
- docs/specs/ui-design.md
- tests/unit/sync-indicator.test.js
- tests/unit/sync-log-view.test.js
- tests/e2e/sync.spec.js

Size estimate: 10 files, 600 lines
Size note: Above the typical line. The indicator, popover, banner, and log screen read one engine state and share its styles.

### Tests
- Unit: each engine state maps to its icon, label, and popover content, including Update required.
- Unit: the sync log view lists entries newest first and clears the unseen dot when opened.
- Integration: going offline with pending changes shows "Offline · n pending", and going online syncs them.
- Integration: an overwritten value shows the dot; opening the sync log clears it and lists the entry.
- Integration: a `426` reply shows Update required; Check for update requests a worker update.

Completion check: `npm test && npm run lint && npm run test:e2e`
