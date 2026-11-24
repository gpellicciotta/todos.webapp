## Technical Specifications

### Notes
- The entry list is CSS only: a native list of cards, message first, then a wrapping chip row led by a time chip.
- The message is the entry kind and item; the chips carry the time and, where present, the reason.
- The values block (lost, kept, undone) goes in the card's details area, rendered as text only.
- Keep the Open link to an item that still exists as the chip row's ending action or a link in the message.

### Declared Files
- src/js/views/sync-log.js
- src/css/views.css
- tests/unit/sync-log-view.test.js
- tests/e2e/sync.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Size estimate: 6 files, 160 lines

### Tests
- Unit: sync-log-view.test.js expects an `.entry-list` with one `.entry-list__item` per entry, newest first, and a time chip.
- Unit: sync-log-view.test.js keeps its checks of values as text, the Open link, the empty state, and marking the log seen.
- Integration: sync.spec.js opens the Sync log after an overwrite and finds the entry card with its kept and lost values.

Completion check: python scripts/devops.py check
