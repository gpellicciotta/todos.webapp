## Technical Specifications

### Declared Files
- src/js/views/settings.js
- src/js/ui/router.js
- src/js/ui/layout.js
- src/js/app.js
- src/index.html
- src/service-worker.js
- tests/unit/settings.test.js
- tests/unit/router.test.js
- tests/unit/layout.test.js
- tests/e2e/connect.spec.js
- docs/specs/ui-design.md
- scripts/draw-wireframes.py
- Deleted, not counted: src/js/views/connect.js and tests/unit/connect.test.js.
- Regenerated, not counted: docs/img/ui/*.svg from scripts/draw-wireframes.py.
- Mechanical, not counted: scripts/sw-precache-hashes.json.

Mechanical command: `python scripts/draw-wireframes.py` and the precache hash script the build runs.
Size estimate: 12 files, 550 lines.
Size note: moving the screen, aliasing the route, and dropping its files cannot merge apart without a dead route.

### Connection Section
Local mode replaces the Connect button with the connect screen's intro, in place:
- "Connecting syncs your data across devices and lets you share lists."
- "It needs an account, so you are no longer anonymous. Access is by invitation."
- The server line and Sign in; the server URL field stays below, as today (`CON-12`).

The other phases render in the same section:
- Signing in: "Signing in…", with no actions.
- Signed in: the connected state as today, with name and email, server, sync state, Sync log, and Disconnect.
  No Done button and no "later version" hint.
- Not invited and error: the status line, the hint, and Sign in to try again; Back to Settings goes away.
- Expired: today's expired text, with Sign in again that signs in directly instead of opening another screen.

The section keeps the polite live region and the focus rules of the connect screen.
After Signing in, focus moves to the first action of the new phase.

### Route
- `#/connect` renders the settings view, scrolls the Connection section into view, and focuses its heading.
- The shell still captures the Auth code from `#/connect?...` before routing, so Auth needs no change.
- Afterwards the address reads `#/settings`; Back does not return to `#/connect`.
- Links to `#/connect` in the user menu, sync indicator, empty state, sharing, and session banner stay as they are.
- The user menu marks Settings as current on both routes.

### Out of Scope
- Upload progress and merge messages on first connect (Connecting flow, steps 5 to 7) stay as specified, unbuilt.
- T0244 fixes the stale hint on the connect screen; if it has not run yet, this task makes it moot.

### Tests
- Unit: in local mode the Connection section shows the intro and Sign in; Sign in starts Auth.
- Unit: finishing a sign-in shows Signing in, then the connected state, and focuses its first action.
- Unit: not invited, error, and expired render in the section with their texts and actions.
- Unit: the router maps `#/connect` to the settings view.
- Integration: the connect e2e spec signs in from Settings, returns through `#/connect`, and lands in Settings, connected.

Completion check: `npm test` and the connect, shell, and sync e2e specs pass.
