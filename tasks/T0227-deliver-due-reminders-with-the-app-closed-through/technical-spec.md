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
- todos.server has no push support yet; a todos.server task must add it first.
- Expected service parts: a public VAPID key route, subscription create and delete routes, and a scheduled sender.
- The service spec defines the route names and payload; this task follows it (`TEC-10`).

### Requirements
- Subscribe only while connected, with reminders on and permission granted.
- Send the lead time with the subscription, so the service fires at the same moment as local reminders.
- A push payload carries the task id, description, and due time; the worker shows it with the T0226 tag.
- When a visible tab already showed a local reminder, the same tag replaces it instead of stacking.
- Disconnect, sign-out, an expired session, and turning reminders off unsubscribe and delete the registration.
- iOS delivers Web Push only to a PWA installed on the home screen; Settings says so on iOS.
- Local mode sends no push request (`LOC-3`).

### Tests
- Unit: subscribe registers with the service; disconnect unsubscribes and deletes.
- Unit: the worker shows a pushed reminder and opens the task on click.
- Unit: a push with a tag already shown replaces the notification.
- Integration: the contract suite registers a subscription against a real todos server and receives a test push payload.

Completion check: `npm run test:unit`, the reminders e2e spec, and `npm run test:contract` pass.
