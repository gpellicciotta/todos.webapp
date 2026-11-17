## Technical Specifications

### Declared Files
- src/js/ui/layout.js
- src/js/core/preferences.js
- src/css/app-chrome.css
- tests/unit/layout.test.js
- tests/unit/preferences.test.js
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md
- docs/specs/local-store.md
- New, not counted: src/js/ui/panel-resize.js and tests/unit/panel-resize.test.js.

Size estimate: 8 files, 380 lines.

### Separators
- From 64rem wide, a separator sits on the sidebar's right edge and on the editor panel's left edge.
- Each is an element with `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` in pixels.
- Its hit area is 8 px wide and shows the resize cursor; a 2 px line in the focus color shows on hover, focus, and drag.
- Its accessible name is "Resize lists sidebar" or "Resize task editor".

### Limits
- Sidebar: 12rem to 24rem; editor panel: 20rem to 40rem.
- The main column never shrinks below 24rem; a drag stops there, and a window resize clamps saved widths.

### Interaction
- Pointer drag uses pointer capture and updates the width every animation frame.
- Arrow keys step 1rem; Home and End jump to the limits.
- Double-click or Enter resets to the default width.
- The width applies by setting `--width-sidebar` or `--width-side-panel` on the app root, so shell.css stays vendored.

### Persistence
- `todos.view.panels` holds `{sidebar, editor}` in rem, saved when a drag or key step ends.
- Unreadable or out-of-range values fall back to the defaults; storage failures change nothing visible.

### Promotion
- A splitter fits support.webapp's shell; file a promotion task there once this proves out.

### Tests
- Unit: dragging and arrow keys change the width within the limits, and the main column keeps 24rem.
- Unit: Home, End, double-click, and Enter behave as specified; the ARIA values follow.
- Unit: widths persist and restore; bad stored values fall back to the defaults.
- Integration: the shell e2e spec drags both separators at 1440 px, reloads, and finds the widths kept.

Completion check: `npm test` and the shell e2e spec pass.
