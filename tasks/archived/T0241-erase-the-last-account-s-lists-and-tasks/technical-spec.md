## Technical Specifications

### Declared Files
- src/js/store/bin.js
- src/js/sync/pull.js
- src/js/sync/adopt.js
- src/js/views/settings.js
- tests/unit/adopt.test.js
- tests/unit/pull.test.js
- tests/unit/settings.test.js
- tests/e2e/connect.spec.js
- docs/requirements.md
- docs/specs/local-store.md
- docs/specs/ui-design.md

Size estimate: 11 files, 450 lines.
Size note: the record, the connect question, and the erase before adoption only work together.

### User Decisions
- A local-mode erase followed by a connect should have the same effect as erasing while connected.
- It erases automatically only for the account this device was last connected to; otherwise it asks.

### State
- Disconnect saves `last-account` as `{email, server}` in `sync-state`; it survives the disconnect.
- A local-mode `deleteAllData()` saves `pending-erase` as `{time, account}`, where `account` is `last-account` or null.
- A later local erase replaces `time` and keeps the account.
- Disconnecting with a queued `erase` entry (T0240) turns it into `pending-erase` with that entry's time.

### Connect
- With no `pending-erase`, connecting works as today.
- With one whose `account` matches the new account, the app calls the erase route with `before` set to its `time`.
- Otherwise the app asks first, in place:
  "You deleted all data on this device on {{date}}. Also erase the lists and tasks of {{email}} created before then?"
  - Erase runs the route as above; Keep skips it.
- The erase runs before adoption, so data created locally after the erase still uploads.
- A failed erase stops the connect like a failed adoption step, keeping `pending-erase` for the next try.
- A successful erase, or Keep, removes `pending-erase`.

### Tests
- Unit: a local erase saves `pending-erase` with the last account, or null on a never-connected device.
- Unit: disconnect saves `last-account`, and turns a queued erase entry into `pending-erase`.
- Unit: connecting to the same account erases before adoption, with `before` set to the saved time.
- Unit: connecting to another account asks, and Keep leaves the account data alone.
- Unit: a failed erase keeps `pending-erase` and stops before adoption.
- Integration: an e2e run connects, disconnects, deletes all data, adds a task, and reconnects.
  Afterwards the account holds only that new task.

Completion check: `npm test`, the connect e2e spec, and `npm run test:contract` pass.
