### Scope
- Covers search, the Lists, Status, Due, and Created filters, Clear all, Sort, and the Group control from T0048.
- Goals: fewer permanent pixels, one entry point per task, active filters visible at a glance.
- Candidates: one Search and filter button with a popover panel; a collapsed bar that expands on focus.
- Must keep: keyboard access, live-region result counts, persistence rules (`TV-12`), compact layout parity.
- Out of scope: code changes.

### Declared Files
- docs/specs/ui-design.md
- docs/requirements.md
- tests/test_draw_wireframes.py
- docs/img/
- CHANGELOG.md

Size estimate: 4 files, 200 lines
Size note: Wireframes under docs/img/ are generated; the drawing command is named in the task log.

### Tests
- Unit: none (design task; no executable code changes)
- Integration: none (design task; no executable code changes)

Completion check: markdown lint on the changed docs, then written design approval from the user
