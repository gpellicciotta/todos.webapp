## Technical Specifications

### Context
- [preferences.js](../../../src/js/core/preferences.js) keeps every preference in `localStorage`, per device.
- [view-controls.js](../../../src/js/views/view-controls.js) stores view options as `todos.view.tasks` and `todos.view.list.{{list-id}}`.
  Each value is `{filter, order: {field, direction}, group}`; Reset removes the key.
- [list-order.js](../../../src/js/core/list-order.js) stores the manual list order as `todos.lists.order`, an array of list IDs.
- [settings.js](../../../src/js/views/settings.js) stores Make Enter add as `todos.enter-adds`; [add-bar.js](../../../src/js/views/add-bar.js) reads it per key press.
- `SYN-13` asks for these settings to follow the account while connected; `TV-12`, `LST-8`, `LST-12`, and `VO-3` point to it.
- The manual order of tasks in a list is already synced: it is the membership `position`, shared with collaborators.
  This task leaves it unchanged.
- todos.server T0262 adds `GET` and `PATCH /api/users/{{user-id}}/settings`; read its REST API spec section first.
  Both accept `me`, merge by edit time, return tombstones as `"value": null`, and answer unchanged polls with `304`.

### Synced Names
The setting name is the preference key without `todos.`.

| Name                     | Requirement | Owner module     | Value                                |
| :----------------------- | :---------- | :--------------- | :----------------------------------- |
| `view.tasks`             | `TV-12`     | view-controls.js | `{filter, order, group}`             |
| `view.list.{{list-id}}`  | `TV-12`     | view-controls.js | `{filter, order, group}`             |
| `view.lists`             | `LST-12`    | T0074's module   | the Lists screen sort                |
| `lists.order`            | `LST-8`     | list-order.js    | array of list IDs                    |
| `enter-adds`             | `VO-3`      | settings.js      | boolean                              |

- `view.lists` does not exist until T0074 adds the Lists screen sort; sync it once it does.
- **[Decided]** Keep per device: `theme`, `server-url`, and the panel widths of T0256, as the user asked.
- **[Decided]** Also keep per device: `sync-log.seen` and the session records; they describe this device, not a preference.
  The sync log itself is per device, so its seen time is too.
- Keep the names in one list, so a later setting joins the sync without changes to the sync code.
- `lists.order` merges as one value: the latest whole order wins, and lists missing from it append as today.
  At 500 lists the array holds about 19 KiB, inside the service's 64 KiB per value.

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

### Refresh
- After applying downloaded settings, tell each owner module, which reloads and redraws.
- A downloaded `lists.order` reaches the sidebar and the Lists screen through the `onListOrderChange` listeners.
- A downloaded `enter-adds` updates the Settings switch when the screen is open; the add bar reads it per key press.
- Other tabs learn of changes through the `storage` event, as `list-order.js` does.
- **[Decided]** While the view options panel is open, a download for that view applies on close, so it never moves the user's focus.
- **[Decided]** During a list drag, a downloaded `lists.order` applies after the drop, which then wins as the newer edit.

### Disconnect and Local Mode
- Disconnecting keeps the current options on the device and clears the pending names, `ETag`, and edit times.
- Local mode never calls the routes.

### Spec Updates
- [ui-design.md](../../../docs/specs/ui-design.md): every line that says a synced setting persists per device.
  Search for "per device" and `TV-12`; hits include the view options, the list order, the Lists screen sort, and Make Enter add.
- Module headers that say "per device": preferences.js, list-order.js, and settings.js.

### Declared Files
- src/js/core/preferences.js
- src/js/core/list-order.js
- src/js/views/view-controls.js
- src/js/views/settings.js
- src/js/sync/engine.js
- src/js/sync/api.js
- src/js/sync/session.js
- docs/specs/ui-design.md
- tests/contract/sync.contract.test.js
- New, not counted: `src/js/sync/settings.js`, `tests/unit/settings-sync.test.js`, and `tests/e2e/settings-sync.spec.js`.

Size estimate: 9 files, 420 lines.
Size note: one sync mechanism serves every setting; splitting by setting would build the same merge and queue twice.

### Tests
- Unit: a write and a removal of a synced name record an edit time; other names record none.
- Unit: the merge applies a newer server value, keeps a newer local one, and removes the key for a newer tombstone.
- Unit: pending names survive a failed `PATCH` and a reload, and a `304` changes nothing.
- Unit: disconnecting clears the pending names, `ETag`, and edit times, and keeps the settings.
- Unit: a downloaded `lists.order` calls the list order listeners, and a downloaded `enter-adds` changes what the add bar reads.
- Unit: `theme` and `server-url` writes never enter the pending names.
- Integration: e2e with two browser contexts on one mocked account: view options, list order, and Enter adding set on one appear on the other.
- Integration: the contract test patches, reads, and conditionally reads settings against a real todos server with T0262.

Completion check: `npm test`, the settings sync e2e spec, and `npm run test:contract` pass.
