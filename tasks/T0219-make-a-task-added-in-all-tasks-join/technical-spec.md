## Technical Specifications

### Behavior
- **[Decided]** A task added in All tasks joins no list, whatever the Lists filter selects (user choice, 2026-11-10).
- **[Decided]** The alternative, joining only a single filtered list, was offered and declined.
- A task the Lists filter hides triggers the existing toast "Task added. Lists: … hides it." with Show.
- Show clears the Lists filter through `clearFilters`, so the new task appears.
- List views are unchanged: the new task joins that list at its end (`TSK-9`, `LV-5`).

### Implementation
- `add()` in `src/js/views/all-tasks.js` calls `store.createTask({ description }, { lists: [] })`.
- `notifyIfHidden` receives `listIds: []`, so the Lists filter counts as hiding the task.
- The service worker `VERSION` bump and manifest refresh follow `npm run check:sw`.

### Declared Files
- src/js/views/all-tasks.js
- tests/unit/all-tasks.test.js
- tests/e2e/all-tasks.spec.js
- docs/specs/ui-design.md
- CHANGELOG.md
- src/service-worker.js

Mechanical command: `node scripts/check-sw-version.mjs --update` rewrites `scripts/sw-precache-hashes.json`.

Size estimate: 6 files, 70 lines

### Tests
- Unit: with the Lists filter set to two lists, adding calls `createTask` with `{ lists: [] }` and toasts "Task added. Lists: 2 lists hides it." with Show; Show clears the Lists filter.
- Integration: e2e in All tasks selects Home and Work in the Lists filter, adds "Paint the door", sees the hiding toast, presses Show, and sees the row; the store holds no membership for the new task.

Completion check: `npm test && npx playwright test tests/e2e/all-tasks.spec.js`
