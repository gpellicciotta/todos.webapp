## Technical Specifications

### Declared Files
- src/js/store/bin.js
- src/js/sync/queue.js
- src/js/sync/push.js
- src/js/sync/engine.js
- src/js/sync/api.js
- src/js/views/settings.js
- tests/unit/settings.test.js
- tests/unit/push.test.js
- tests/unit/engine.test.js
- tests/e2e/bin-settings.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- docs/specs/local-store.md
- New, not counted: a contract test for the erase route under tests/contract/.

Size estimate: 13 files, 600 lines.
Size note: the dialog, the queue entry, and the push cannot merge apart without a button that erases half the data.
Combined task: the UI and the sync code change together, since neither works alone.

### User Decisions
- Delete all data erases lists and tasks only, never the account; Delete account is T0242.
- On the service it erases everything the user owns, including their tasks in lists of others.
- The user leaves lists of others shared with them; collaborators lose the lists the user owned.

### Behavior
- Connected or expired, `deleteAllData()` erases locally as today, then queues one `erase` entry with `time`.
  - Entries queued before it are dropped, since the erase covers them.
  - Entries queued after it push after it.
- push.js sends `DELETE /api/users/{{user-id}}/data?before={{time}}` for an `erase` entry.
  - 2xx: done; the counts go to the sync log as one record.
  - 401 pauses the queue as for any entry; offline keeps the entry.
  - Other 4xx: the entry is dropped and logged as an error, and the user sees the usual rejection toast.
- engine.js skips the pull while an `erase` entry is queued, and pulls right after it succeeds.
- The pull then applies the tombstones the erase produced; local data is already gone.
- Local mode keeps today's local-only erase; T0241 covers syncing it on the next connect.

### Settings
- Delete all data is enabled while connected; the "Disconnect first" hint goes away.
- The connected dialog text adds: "This also erases them from your account on every device.
  People you share lists with lose those lists. You leave lists others share with you."
- The counts include only rows the user owns, plus a line for lists shared with them.
- Typing DELETE, the export offer, and the focus rules stay as they are.

### Tests
- Unit: connected `deleteAllData` drops earlier entries and queues one `erase` entry.
- Unit: push sends the erase route with `before` and handles 2xx, 401, offline, and other 4xx.
- Unit: the engine does not pull while an erase is queued, and pulls after it succeeds.
- Unit: Settings enables the button while connected and shows the connected text.
- Integration: the contract suite erases a test account against a real todos server; its feed then has tombstones.
- Integration: an e2e run erases while connected through the mocked service and shows an empty app after the next sync.

Completion check: `npm test`, the bin-settings and sync e2e specs, and `npm run test:contract` pass.
