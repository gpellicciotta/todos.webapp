## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- src/js/views/view-controls.js
- src/js/views/all-tasks.js
- src/js/ui/layout.js
- tests/unit/task-list.test.js
- tests/e2e/performance.spec.js

Size estimate: 6 files, 400 lines

### Tests
- Unit: a store change that touches one task updates only that task's row and keeps the other row elements.
- Unit: typing in search runs one query after the debounce delay, not one per keystroke.
- Integration: with 5000 seeded tasks, All tasks renders within 400 ms in desktop Chromium, as a proxy for 200 ms on phones.
- Integration: the minute tick keeps an open status menu open and focus in place.

### Follow-Ups From Earlier Reviews
- From T0035: announce the Reload notice through the live region instead of a `role="status"` element created with text.
- From T0037: a stored filter for a deleted list must not show as an active chip; drop the unused `STRINGS.range`.
- From T0037: filter chips must not carry both `aria-pressed` and `aria-expanded`.
- From T0016: compact layouts need a way to delete a task before the editor lands, or the editor must provide it.

Completion check: `npm test && npm run lint && npm run test:e2e && npm run check:sw`
- From T0036: when a reopened Add to list menu has no items, close it and focus the More button.
- From T0020: the bin's 60 s redraw rebuilds rows; redraw only when the local date changes.
- From T0020: a failed permanent delete leaves the in-row question without state; restore it and keep focus.
- From T0020: align the bin's days-left label with the exact 30-day purge time.
- From T0020: accept a plain `light` or `dark` stored theme before the JSON fallback.
- From T0018: Escape after an edit saves the value twice; record saved values in `shown` inside the save helpers.
- From T0018 reviews: the gallery-controls focus-ring e2e test nears its 30 s timeout under parallel load; make it faster or raise its timeout.
- From T0017: autoscroll during a drag and recompute row midpoints; end the drag cleanly when a re-render drops pointer capture.
- From T0017: close the Delete list dialog when the list view unmounts.
