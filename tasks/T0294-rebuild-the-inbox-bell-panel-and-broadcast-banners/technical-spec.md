## Technical Specifications

### Package Fit
- inbox.js rows carry Open, Mark read, and Discard, plus Discard all, an empty state, and a summary line.
- It adds checkbox selection with bulk Mark read and Discard, which the app does not have today.
- It emits bubbling `inbox:action` and `inbox:navigate` events and never calls app APIs or routers.
- `attachUnreadButton` caps the badge at `99+` and puts the unread count in the accessible name, as the app does.
- notices.js shows the most severe, then newest, sticky inbox notification as one banner; the app shows one per notice.
  Record whether that change is acceptable in the Decide step, or keep the app's banners and adopt only the inbox.
- All service texts render as text only; notices.js validates action URLs as same-origin paths or `http(s)` links.
- The offline note ("Offline. Showing the last inbox.") stays, as the summary line or a panel note.

### Decisions
- **[Decided]** Keep the package's bulk selection in the panel.
  The package builds it unconditionally; hiding it would couple app CSS to package internals.
  The service has no bulk endpoint, so a bulk action sends one request per notification, in order.
  Any refusal shows one toast; the accepted changes stay.
- **[Decided]** Accept one broadcast banner at a time from notices.js.
  Each banner notification still shows until dismissed (`NTF-3`), the most severe and newest first.
  With more than one, "View all N alerts" opens the inbox panel instead of navigating.
- **[Decided]** Feed notices.js only the unread banner notifications, since its sticky test ignores the read state.
  The bell and the panel follow sync/inbox.js directly rather than the notices store.
- **[Decided]** Dismiss marks the notification read, as before; the package's discard callback calls `markRead`.
- **[Decided]** Open links keep opening in a new tab with `noopener noreferrer`.
  The package renders same-tab links, so the view adds `target` and `rel` after each render.
- **[Decided]** The offline note stays a panel note under the package header, so it also shows with no rows.
- **[Decided]** The package inbox sits in the panel only while it is open.
  Otherwise its `.view-header` and `.empty-state` stay in the page, also in local mode (`LOC-1`).
  The first completion check run failed 10 e2e tests on exactly that.
- **[Decided]** Rows show the package's relative time chip, with the full device-timezone time as its tooltip.
- **[Decided]** The bell keeps the full unread count in its name ("Inbox, 120 unread"); the badge caps at `99+`.

### Declared Files
- src/js/ui/inbox.js
- src/css/app-chrome.css
- src/service-worker.js
- src/index.html
- tests/unit/inbox-ui.test.js
- tests/unit/layout.test.js
- tests/e2e/inbox.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 8 files, 380 lines

Size note: Measured 9 files and 727 lines; the ui/inbox.js and inbox-ui.test.js rewrites are most of it.
The view and its tests cannot merge apart, so the task stays whole.
src/js/app.js needed no change; src/index.html preloads the new vendored modules (TEC-16).
tests/unit/layout.test.js follows the bell's package class.

### Tests
- Unit: inbox-ui.test.js checks the unread button label and `99+` cap, row actions, Discard all, and the empty state.
- Unit: inbox-ui.test.js checks that each `inbox:action` calls the matching sync/inbox.js request and reverts with a toast on failure.
- Unit: inbox-ui.test.js checks that unsafe action URLs render no Open link.
- Integration: inbox.spec.js runs connected with notifications, reads, discards, clears, and dismisses a banner.
- Integration: inbox.spec.js checks that local mode shows no bell.

Completion check: python scripts/devops.py check
