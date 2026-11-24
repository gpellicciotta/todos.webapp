## Technical Specifications

### Problem
`showFirstLaunch()` in `src/js/views/all-tasks.js` runs whenever the store holds no tasks.
It never reads the session, so a connected account whose tasks were all deleted sees:
- "Your tasks stay on this device.", which is false while connected.
- A "Connect to sync across devices" link to `#/connect`, although the account is already connected.

The view renders again only on store changes, so connecting or disconnecting does not refresh the empty state.

### Behavior
- Connected means `session.state() !== 'local'`, as in `effectiveFilter()` and `import-dialog.js`.
  This covers `connected` and `sign-in-needed`.
- Local, or no `session` option: keep the current title, text, and both links.
- Connected:
  - Title: "No tasks yet."
  - Text: "Your tasks sync across your devices."
  - Links: Import a backup (`#/settings`) only; the import dialog supports connected imports.
- Subscribe to `session.subscribe` when present, as `lists.js` and `settings.js` do.
  On a session change, re-render so the empty state updates; unsubscribe in `destroy()`.
- Add the new string to `STRINGS` (for example `emptyTextConnected`).
- Keep `root.dataset.state` as `first-launch` in both modes, unless a test needs to tell them apart.

### Declared Files
- src/js/views/all-tasks.js
- tests/unit/all-tasks.test.js
- tests/e2e/all-tasks.spec.js
- docs/specs/ui-design.md

### Tests
- Unit: with a session in state `connected`, an empty store shows the connected text and Import a backup only.
- Unit: with a session in state `sign-in-needed`, an empty store hides the Connect link.
- Unit: with a local session, or no session, the empty state keeps both links and the local text.
- Unit: a session change from `local` to `connected` redraws the empty state without a store change.
- Integration: an e2e case connects, deletes every task, and sees no Connect link in the empty state.
  Reuse the connected fixtures of the existing e2e suites; if none fits, state why in the validation proof.

### Out of Scope
- The `first-launch.svg` wireframe, which shows the local first launch only.
- Empty states of a single list view or the Lists screen.

Completion check: `npx vitest run tests/unit/all-tasks.test.js` and `npx playwright test tests/e2e/all-tasks.spec.js`.
