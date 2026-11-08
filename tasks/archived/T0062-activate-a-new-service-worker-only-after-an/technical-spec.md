## Technical Specifications

### Decisions
- **[Decided]** The worker no longer calls `skipWaiting()` on install; it activates when the page posts `{type: 'skip-waiting'}`.
  `clients.claim()` stays in `activate`.
- **[Decided]** A waiting worker shows an Update toast, "A new version is ready", with an Update button.
  The toast does not time out; dismissing it hides it until the next start.
- **[Decided]** Update posts the message, waits for `controllerchange`, and reloads once; a guard stops reload loops.
- **[Decided]** The first install has no waiting worker and no toast; the page is already on the new files.
- **[Decided]** The database handles `versionchange` by closing its connection and showing the reload banner.
  An open that is `blocked` by an old tab shows "Close other tabs of ToDo's to finish the update" instead of hanging.
- Today's risk, from devops.md: a long-open tab mixes old modules with new files. The waiting state removes it for the updating tab;
  other tabs get the reload banner on `controllerchange`.

### Declared Files
- src/service-worker.js
- src/js/app.js
- src/js/store/db.js
- src/js/strings.js
- src/css/app-components.css
- tests/unit/service-worker.test.js
- tests/e2e/service-worker.spec.js
- docs/devops.md
- docs/specs/ui-design.md

Size estimate: 9 files, 300 lines
Size note: Above the typical file count. Worker, page, and store handling of one update protocol cannot merge apart.

### Tests
- Unit: install does not call `skipWaiting()`; the `skip-waiting` message does.
- Unit: the update helper shows the toast for a waiting worker, posts the message, and reloads once after `controllerchange`.
- Unit: `versionchange` closes the connection and raises the reload banner; `blocked` shows the close-other-tabs message.
- Integration: end-to-end, serve version A, load, serve version B, reload; the toast appears, the page keeps version A until Update, then runs B.
- Integration: a second tab open during the update shows the reload banner.

Completion check: `npm test`, `npm run lint`, `npx playwright test tests/e2e/service-worker.spec.js tests/e2e/pwa.spec.js`, and `npm run check:sw`.
