## Technical Specifications

### Declared Files
- src/css/views.css
- src/css/app-components.css
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Size estimate: 5 files, 120 lines.

### Layout
- Views `tasks`, `list`, `lists`, and `bin` drop the `--width-main` cap and fill `.app__main`, keeping its gutters.
- Views `settings`, `sync-log`, and `connect` keep `max-inline-size: var(--width-main)`, centered.
- `.app__action-bar > .add-block` matches the view above it: full width for row views, 45rem otherwise.
- With the editor side panel open, rows fill the space left of it.
- Row parts keep their order; only the description or name grows, and the ellipsis stays for text longer than the row.
- Compact layouts already fill the width and stay unchanged.

### Tests
- Unit: none (a CSS-only change, which jsdom cannot lay out).
- Integration: at 1440 px, a long task row in All tasks, a list, the Lists screen, and the Recycle Bin is wider than 45rem.
- Integration: at 1440 px, the Settings column stays 45rem wide; the add block matches the view above it.

Completion check: `npm test` and the shell e2e spec pass.
