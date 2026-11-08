## Technical Specifications

### Prerequisites Outside This Project
- The todos sharing endpoints of the REST API spec, including the fixes in todos tasks T0121 and T0143.

### Declared Files
- src/js/views/sharing.js
- src/js/core/permissions.js
- src/js/views/list-editor.js
- src/js/views/view-controls.js
- tests/unit/permissions.test.js
- tests/e2e/sharing.spec.js

Size estimate: 6 files, 450 lines
Size note: the sharing section needs the permission rules it displays.
Size note: the diff reached 28 counted files and 1857 lines, above the large line and three times the estimate. SHR-4 asks for role-aware actions on every screen, so the work also touched the undeclared files app.js, router.js, all-tasks.js, list.js, lists.js, list-actions.js, task-list.js, task-editor.js, service-worker.js, index.html, views.css, the existing unit tests, and the docs. Splitting would have left screens offering actions the service refuses.
Mechanical command: node scripts/check-sw-version.mjs --update (scripts/sw-precache-hashes.json)

### Tests
- Unit: the permission rules match the service's business logic table for every role and action.
- Integration: an owner invites an email with a role, changes it, and removes it, against a mocked API.
- Integration: a viewer sees the list read-only, without edit, move, or delete controls.
- Integration: offline, the sharing controls are disabled and the banner shows.

Completion check: `npm test && npm run lint && npm run test:e2e`

### Follow-Ups From Earlier Reviews
- From T0017: the list header's Share must open the list editor scrolled to its Sharing section.
