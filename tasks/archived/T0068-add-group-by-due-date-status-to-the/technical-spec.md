### Declared Files
- src/js/views/view-controls.js
- src/js/views/list.js
- tests/unit/view-controls.test.js
- tests/unit/list.test.js
- tests/e2e/list.spec.js
- docs/specs/ui-design.md
- CHANGELOG.md

### Decisions
- **[Decided]** A list view offers None, Due date, and Status; List is not offered (`LV-11`).
- **[Decided]** Manual order stays the sort while grouped; each group keeps the manual order, and the grips and moves hide (`LV-8`).
- **[Decided]** The grouping persists in the entry shared by every list view; no new storage.

### Tests
- Unit: a list view state reads `due` and `status` groupings from storage and still rejects `list`.
- Unit: the View options panel of a list shows Group by with None, Due date, and Status, and Reset clears it.
- Unit: a grouped list view renders headers, keeps the manual order inside groups, and hides the drag handles.
- Integration: end-to-end, grouping a list by Status shows headers, no grips, survives a reload, and Reset restores both.

Completion check: `npm test` and `npx playwright test`
