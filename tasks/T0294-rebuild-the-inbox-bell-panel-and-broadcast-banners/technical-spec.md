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

### Declared Files
- src/js/ui/inbox.js
- src/js/app.js
- src/css/app-chrome.css
- src/service-worker.js
- tests/unit/inbox-ui.test.js
- tests/e2e/inbox.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 8 files, 380 lines

### Tests
- Unit: inbox-ui.test.js checks the unread button label and `99+` cap, row actions, Discard all, and the empty state.
- Unit: inbox-ui.test.js checks that each `inbox:action` calls the matching sync/inbox.js request and reverts with a toast on failure.
- Unit: inbox-ui.test.js checks that unsafe action URLs render no Open link.
- Integration: inbox.spec.js runs connected with notifications, reads, discards, clears, and dismisses a banner.
- Integration: inbox.spec.js checks that local mode shows no bell.

Completion check: python scripts/devops.py check
