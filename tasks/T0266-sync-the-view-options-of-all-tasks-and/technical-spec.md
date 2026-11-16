## Technical Specifications

### Context
- [preferences.js](../../../src/js/core/preferences.js) keeps every preference in `localStorage`, per device.
- [view-controls.js](../../../src/js/views/view-controls.js) stores view options as `todos.view.tasks` and `todos.view.list.{{list-id}}`.
  Each value is `{filter, order: {field, direction}, group}`; Reset removes the key.
- `TV-12` now asks for these options to follow the account while connected.
- todos.server T0262 adds `GET` and `PATCH /api/users/{{user-id}}/settings`; read its REST API spec section first.
  Both accept `me`, merge by edit time, return tombstones as `"value": null`, and answer unchanged polls with `304`.

### Synced Names
- **[Decided]** Sync `view.tasks` and `view.list.{{list-id}}`; the setting name is the preference key without `todos.`.
- **[Decided]** Keep per device: `theme`, `enter-adds`, `server-url`, `sync-log.seen`, `lists.order`, and session records.
  `LST-8` and `LST-12` say the list order and the Lists screen sort stay on the device; changing them is a separate task.
- Add the names in one list, so a later task can add a name without touching the sync code.

### Edit Times
- Each write or removal of a synced name records its edit time in `todos.settings.edit-times`, a map of name to ISO time.
- A key stored before this task has no edit time and counts as the oldest possible.
- Writes go through preferences.js as today; views keep calling `saveViewState` and `clearViewState`.

### Sync Run
- Run inside each engine run while connected, after the queue replay and the feed pull.
- Upload: send changed names since the last upload in one `PATCH`, with `edit-times` per name.
  A removal sends `null`. Keep the pending names in `todos.settings.pending` so a closed tab or offline period loses nothing.
- Download: otherwise `GET` with the last `ETag` in `If-None-Match`; a `304` ends the step.
- Apply each server entry whose edit time is after the local one: write the value, or remove the key for `null`.
  Store the server edit time locally, so the next run does not send it back.
- On the first connect, upload local options that the server lacks or holds with an older edit time.
- A failed call leaves the pending names for the next run and never changes the sync state shown to the user.
- Prune: after a list is permanently deleted, send `null` for its `view.list.{{list-id}}`.

### View Refresh
- After applying downloaded options, tell the open view, which reloads its state and redraws the controls.
- Other tabs learn of changes through the `storage` event, as `list-order.js` does.
- **[Decided]** While the view options panel is open, a download for that view applies on close, so it never moves the user's focus.

### Disconnect and Local Mode
- Disconnecting keeps the current options on the device and clears the pending names, `ETag`, and edit times.
- Local mode never calls the routes.

### Spec Updates
- [ui-design.md](../../../docs/specs/ui-design.md): lines that say options persist per device (`TV-12`, around lines 132, 353, 365, and 519).

### Declared Files
- src/js/core/preferences.js
- src/js/views/view-controls.js
- src/js/sync/engine.js
- src/js/sync/api.js
- src/js/sync/session.js
- docs/specs/ui-design.md
- tests/contract/sync.contract.test.js
- New, not counted: `src/js/sync/settings.js`, `tests/unit/settings-sync.test.js`, and `tests/e2e/settings-sync.spec.js`.

Size estimate: 7 files, 350 lines.

### Tests
- Unit: a write and a removal of a synced name record an edit time; other names record none.
- Unit: the merge applies a newer server value, keeps a newer local one, and removes the key for a newer tombstone.
- Unit: pending names survive a failed `PATCH` and a reload, and a `304` changes nothing.
- Unit: disconnecting clears the pending names, `ETag`, and edit times, and keeps the options.
- Integration: e2e with two browser contexts on one mocked account: options set on one appear on the other after a sync run.
- Integration: the contract test patches, reads, and conditionally reads settings against a real todos server with T0262.

Completion check: `npm test`, the settings sync e2e spec, and `npm run test:contract` pass.
