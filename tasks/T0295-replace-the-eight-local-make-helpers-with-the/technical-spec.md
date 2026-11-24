## Technical Specifications

### Notes
- **[Decided]** Keep the `make(doc, tag, className, text)` signature, so the about 260 call sites stay unchanged.
- The local copies live in inbox.js, user-menu.js, recycle-bin.js, settings.js, sync-indicator.js, sync-log.js, task-list.js, and view-controls.js.
- task-list.js exports `make`; nine view modules import it, some as `el`; keep that export as a re-export.
- `h` escapes text through text nodes, as `make` does; an empty or missing text adds no child.

### Declared Files
- src/js/ui/inbox.js
- src/js/ui/user-menu.js
- src/js/views/recycle-bin.js
- src/js/views/settings.js
- src/js/views/sync-indicator.js
- src/js/views/sync-log.js
- src/js/views/task-list.js
- src/js/views/view-controls.js
- src/service-worker.js
- src/index.html
- Added, uncounted: src/js/ui/dom.js, tests/unit/dom.test.js

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 10 files, 140 lines
Size note: 10 counted files exceed the typical 8; each loses the same helper, so splitting would leave copies behind.

### Tests
- Unit: dom.test.js checks that `make` sets the class, sets text as a text node, and adds no child for empty text.
- Integration: the full e2e suite passes unchanged, since no markup changes.

Completion check: python scripts/devops.py check
