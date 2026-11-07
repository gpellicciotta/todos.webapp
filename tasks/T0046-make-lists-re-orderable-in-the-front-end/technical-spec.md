### Decisions
- **[Decided]** The order lives in a device preference (`core/preferences.js`), never in the store or the sync feed.
- **[Decided]** The preference holds list IDs; unknown IDs are dropped and unlisted lists append in name order.
- **[Decided]** Reordering reuses the task reorder model: drag handle, Move up, Move down.
- Sidebar and Lists screen always show the same order.

### Declared Files
- src/js/core/list-order.js
- src/js/core/preferences.js
- src/js/views/lists.js
- src/js/ui/layout.js
- src/css/views.css
- src/js/views/reorder.js
- src/service-worker.js
- docs/specs/ui-design.md
- tests/unit/lists.test.js
- tests/unit/layout.test.js
- tests/unit/reorder.test.js
- tests/unit/list-order.test.js
- tests/e2e/lists.spec.js
- docs/requirements.md
- CHANGELOG.md

Size estimate: 9 files, 300 lines
Size note: Sidebar and Lists screen share one order, so both ship together with the drag reuse, worker precache, and docs; measured 14 files, 735 lines.

### Tests
- Unit: `applyListOrder` places stored IDs first, drops unknown IDs, appends new lists, and survives an empty preference.
- Unit: move helpers shift a list up or down and clamp at both ends.
- Unit: the order round-trips through the preference and ignores corrupt stored values.
- Integration: Playwright drags a list in the Lists screen, reloads, and sees the same order in the sidebar.
- Integration: Playwright reorders with Move up and Move down using only the keyboard and checks the live-region message.

Completion check: npm test && npx playwright test tests/e2e/lists.spec.js
