## Technical Specifications

### Declared Files
- src/js/ui/layout.js
- src/js/views/all-tasks.js
- src/js/views/list-actions.js
- src/css/app-chrome.css
- src/img/icons.svg
- tests/unit/layout.test.js
- tests/unit/all-tasks.test.js
- tests/unit/list.test.js
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md
- scripts/draw-wireframes.py
- Regenerated, not counted: docs/img/ui/*.svg from scripts/draw-wireframes.py.

Mechanical command: `python scripts/draw-wireframes.py`.
Size estimate: 11 files, 450 lines.
Size note: the header slot and moving both menus into it cannot merge apart without two menus at once.

### Header Button
- From 64rem wide, `.app__top-actions` holds a view actions button before the user menu.
- It is an `icon-button` with a new `more-vertical` sprite icon, three dots stacked vertically.
- Its accessible name is the view's actions label: "All tasks actions" or "{{list}} actions".
- It uses the existing `attachMenu` behavior: Enter, Space, and arrows open it; Escape closes it and returns focus.

### Per View
- All tasks: Edit view options.
- A list: the list-actions menu as today, with items left out by the user's role (`VO-4`, `LST-6`).
- Lists, Recycle Bin, Settings, Sync log: no actions, so the button is hidden.
- The view registers its menu with the shell on mount and removes it on destroy.

### Compact Layouts
- Below 64rem, the menu stays in the view header with the horizontal More icon, as today.
- Resizing across 64rem moves the menu without losing an open state; an open menu closes.

### Tests
- Unit: on a wide layout All tasks puts its menu in the header and none in the view header.
- Unit: a list's header menu holds the role-filtered items, and Delete list still asks first.
- Unit: views without actions hide the header button; compact layouts keep the view header button.
- Integration: the shell e2e spec opens Edit view options from the header at 1440 px and from the view at 390 px.

Completion check: `npm test` and the shell e2e spec pass.
