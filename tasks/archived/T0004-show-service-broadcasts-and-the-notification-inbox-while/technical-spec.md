## Technical Specifications

Contract source: the todos service `docs/specs/rest-api-spec.md`, section Notifications & Broadcasts (read-only).
Endpoints used, all with `Authorization: Bearer {{token}}`:
- `GET /api/notifications`, most recent first.
- `POST /api/notifications/{{id}}/read`, `DELETE /api/notifications/{{id}}`, `POST /api/notifications/clear-all`.

### Decisions
- **[Decided]** A bell button in the top bar opens the inbox popover; it shows only while connected.
- **[Decided]** A notification with `banner: true` that is unread shows as a banner above every view; Dismiss marks it read.
- **[Decided]** Refresh at start, on sign-in, when the tab becomes visible, and every 2 minutes while visible and connected.
- **[Decided]** Local mode and an expired session send no inbox request (`LOC-3`) and show no bell (`LOC-1`).
- **[Decided]** A `401` expires the session; a network failure keeps the last inbox and reports offline quietly.
- **[Decided]** Mutations wait for the server answer; failure shows a toast and changes nothing.
- **[Decided]** Action links open only for `http:` and `https:` addresses, resolved against the server, in a new tab with `noopener`.
- **[Decided]** Texts render with `textContent` only.
- **[Decided]** Requirements move from Planned After v1.0.0 into a new Notifications section, `NTF-1` to `NTF-7`.

### Declared Files
- src/js/sync/inbox.js
- src/js/ui/inbox.js
- src/js/ui/layout.js
- src/js/app.js
- src/img/icons.svg
- src/css/app-chrome.css
- src/css/app-shell.css
- src/index.html
- src/service-worker.js
- scripts/sw-precache-hashes.json
- tests/unit/inbox.test.js
- tests/unit/inbox-ui.test.js
- tests/e2e/inbox.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- CHANGELOG.md

Size estimate: 16 files, 700 lines
Size note: Above the typical line because one feature needs a client module, a view module, wiring, CSS, tests, and specs; splitting would leave an unusable half.

### Tests
- Unit: `inbox.test.js` covers the client: normalizing, refresh, polling, no request in local mode or after expiry, 401 expiry, offline, mark read, discard, clear all.
- Unit: `inbox-ui.test.js` covers the bell, the unread badge, the panel rows and actions, the banners and Dismiss, and unsafe action links.
- Integration: `inbox.spec.js` runs the app against a mocked service: bell and banner while connected, mark read, discard, none in local mode.

Completion check: `npm test && npm run lint && npx playwright test tests/e2e/inbox.spec.js`
