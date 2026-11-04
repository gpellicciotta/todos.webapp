## Technical Specifications

### Findings
- From T0035: announce the Reload notice through the live region instead of a `role="status"` element created with text.
- From T0037: a stored filter for a deleted list must not show as an active chip; drop the unused `STRINGS.range`.
- From T0037: filter chips must not carry both `aria-pressed` and `aria-expanded`.
- From T0016: compact layouts need a way to delete a task before the editor lands, or the editor must provide it.
- From T0036: when a reopened Add to list menu has no items, close it and focus the More button.
- From T0020: a failed permanent delete leaves the in-row question without state; restore it and keep focus.
- From T0020: align the bin's days-left label with the exact 30-day purge time.
- From T0020: accept a plain `light` or `dark` stored theme before the JSON fallback.
- From T0018: Escape after an edit saves the value twice; record saved values in `shown` inside the save helpers.
- From T0018 reviews: the gallery-controls focus-ring e2e test nears its 30 s timeout under parallel load; make it faster or raise its timeout.
- From T0017: autoscroll during a drag and recompute row midpoints; end the drag cleanly when a re-render drops pointer capture.
- From T0017: close the Delete list dialog when the list view unmounts.
- From T0019: editors' destroy() must flush a fixed field that still carries aria-invalid (Firefox fires no change on removal).
- From T0019: link the list editor's character counter with aria-describedby.

- From T0024: the connect card's aria-live plus inner role=alert double-announces; move focus to Done or Sign in on phase changes.
- From T0024: settings.js should navigate with the `navigate` option instead of setting `location.hash`.
- From T0024: devops.md should list `/sign-in` among the routes that need CORS headers.

### Declared Files
The findings span about ten view, editor, and test files; the task log lists the exact files touched.

Size estimate: 12 files, 400 lines
Size note: many small fixes across modules; each finding stays a small, separately tested change.

### Tests
- Unit: each finding gets a regression test that fails before its fix, in the module's existing test file.
- Integration: the full e2e suite passes, and the gallery-controls focus-ring test finishes well under its timeout.

Completion check: `npm test && npm run lint && npm run test:e2e && npm run check:sw`
