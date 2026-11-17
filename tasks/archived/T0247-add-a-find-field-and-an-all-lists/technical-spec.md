## Technical Specifications

### Declared Files
- src/js/views/recycle-bin.js
- src/css/views.css
- tests/unit/recycle-bin.test.js
- tests/e2e/bin-settings.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- scripts/draw-wireframes.py
- Regenerated, not counted: docs/img/ui/recycle-bin.svg.

Mechanical command: `python scripts/draw-wireframes.py`.
Size estimate: 7 files, 350 lines.

### Requirement
- BIN-8: Users filter the recycle bin by typed text and by type: all, lists, or tasks.

### Controls
- The find field and the type choice sit above the rows, under Empty recycle bin, while the bin has entries.
- The type choice is a radio group of All, Lists, and Tasks; All is the default.
- The field takes 100 characters (`FIND_MAX_LENGTH`), with the placeholder "Find in the recycle bin".

### Matching
- Text matches list names and task descriptions, ignoring case and accents, anywhere in the text.
  Reuse `foldText` from [list-find.js](../../../../src/js/core/list-find.js).
- Matches keep the bin's order, with no ranking.
- The rows filter once typing pauses for 150 ms (`TEC-16`); the type choice applies at once.

### Feedback
- The info line reads "37 entries" unfiltered, and "4 of 37 entries" filtered.
- A quiet Reset link ends it while text or type differ from the default, and clears both.
- No match shows "Nothing in the recycle bin matches "{{text}}"."; with only a type, "No deleted lists." or "No deleted tasks."
- A polite live region announces the match count after each change.

### Keyboard and State
- Escape in the field clears the text; Down moves into the rows.
- `/` focuses the field while the Recycle Bin is open.
- Text and type last for the session, like the Lists screen field.
- Restoring or deleting an entry keeps the filter, and focus moves to the next matching row.

### Tests
- Unit: text matches names and descriptions, ignoring case and accents.
- Unit: the type choice narrows to lists or tasks, and combines with text.
- Unit: the info line counts matches; Reset clears text and type.
- Unit: no-match texts, Escape, and the live region announcement.
- Integration: the bin-settings e2e spec deletes several items, filters by text and type, and restores a match.

Completion check: `npm test` and the bin-settings e2e spec pass.
