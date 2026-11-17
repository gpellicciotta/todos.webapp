## Technical Specifications

### Declared Files
- src/js/sync/api.js
- src/js/views/settings.js
- tests/unit/api.test.js
- tests/unit/settings.test.js
- tests/e2e/connect.spec.js
- docs/requirements.md
- docs/specs/ui-design.md

Size estimate: 7 files, 300 lines.

### Service
- `PUT /api/users/{{user-id}}` with `{ "delete": true, "reason": "Requested by the user" }` marks the account.
- The service purges marked accounts after `DAYS_UNTIL_DELETED_USER_GETS_PURGED` days, with tombstones.
- `{ "undo-delete": true }` restores a marked account before the purge.

### Behavior
- Delete account is a danger button in the Account section, shown only while connected.
- Its dialog names the account and says the service erases it with all its lists and tasks.
- It needs the account email typed, exact, before Delete account enables.
- After a 2xx reply, the app disconnects as Disconnect does and keeps the user's own data locally.

### Decisions
- **[Decided]** The dialog offers no undo and names no delay: the service sets the delay, and the specs expose no endpoint for it.
- **[Decided]** Sign-in during the grace period stays unchanged: the service specs do not say it is blocked, so the app adds no special state.
- The user ID comes from the sync queue state `user-id`; the dialog fails with a toast while it is unknown.

### Tests
- Unit: the button shows only while connected and needs the email typed.
- Unit: a 2xx reply disconnects; a failure keeps the session and shows a toast.
- Integration: an e2e run through the mocked service marks the account and returns to local mode.

Completion check: `npm test` and the connect e2e spec pass.
