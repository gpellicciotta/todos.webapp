## Technical Specifications

### Declared Files
- src/service-worker.js
- src/js/sync/api.js
- src/js/views/settings.js
- tests/unit/service-worker.test.js
- tests/unit/api.test.js
- docs/requirements.md
- New, not counted: src/js/sync/push-subscription.js and its unit test.

### Service Dependency
- These cross-project needs cannot go in `needs`.
  - T0260: `GET /api/push/vapid-public-key` and `GET`, `POST`, `PATCH`, `DELETE` on `/api/push-subscriptions`.
  - T0261 (needs T0260): the background job sends the pushes six times a day; there is no dispatch route.
- todos.server T0261 is completed; the release deploys both together.
- For contract tests, the loop manager builds the sibling todos.server checkout; do not build or edit it.
  From a worktree, set `TODOS_SERVER_DIR=../../../../todos.server`.
- todos.server T0308 checks a real push in Chrome and Firefox after this task; T0317 checks Android after the release.
- Planned subscription body: `endpoint`, `keys.p256dh`, `keys.auth`, `lead-minutes` (0, 5, 15, 30, or 60), and `device-name`.
- Planned payload: `type` `task-due` or `tasks-due`, `tag`, `task-id`, `occurrence`, `description`, `due-time`, `action-url`.
- Planned tag: `task-due:{{task-id}}:{{due-time}}`; T0226 uses the same tag for local reminders.
- The service spec defines the final route names and payload; this task follows it (`TEC-10`).

### Requirements
- Subscribe only while connected, with reminders on and permission granted.
- Send the lead time with the subscription.
  A pushed reminder arrives up to 4 hours before the local fire time, so its text names the due time.
- A push payload carries the task id, description, and due time; the worker shows it with the T0226 tag.
- When a visible tab already showed a local reminder, the same tag replaces it instead of stacking.
- Disconnect, sign-out, an expired session, and turning reminders off unsubscribe and delete the registration.
- iOS delivers Web Push only to a PWA installed on the home screen; Settings says so on iOS.
- Local mode sends no push request (`LOC-3`).

### Tests
- Unit: subscribe registers with the service; disconnect unsubscribes and deletes.
- Unit: the worker shows a pushed reminder and opens the task on click.
- Unit: a push with a tag already shown replaces the notification.
- Integration: the contract suite registers, reads, and deletes a subscription against a real todos server.
- Integration: an end-to-end test delivers the service's example payload to the worker and sees the notification.
  The service has no route that sends a push on demand; todos.server T0261 tests the sending.

Completion check: `npm test`, the reminders e2e spec, and `npm run test:contract` pass.
