## Technical Specifications

### Notes
- `attachLabelTooltips(root, { selector, when, placement })` delegates events, so later buttons need no setup.
- Pass `when: (control) => !control.hasAttribute('title')`, so a control with a hint title shows one tooltip only.
- Hint titles stay on: task status buttons (task-list.js), the add bar button (add-bar.js), and task editor status buttons.
- Rail entries already get tooltips from `attachAppNav` since T0254; do not attach a second controller to the sidebar.
- Destroy the controller when the shell is torn down, as other shell controllers do.

### Declared Files
- src/js/ui/layout.js
- src/js/ui/inbox.js
- src/js/views/lists.js
- src/service-worker.js
- tests/unit/layout.test.js
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 8 files, 120 lines

### Tests
- Unit: layout.test.js checks that the shell attaches one label tooltip controller and skips controls with a title.
- Unit: add-bar.test.js keeps its hint title assertions unchanged.
- Integration: shell.spec.js hovers and focuses a view's More button and finds a visible tooltip with its accessible name.
- Integration: shell.spec.js hovers a task status button and finds its native title, without a label tooltip.

Completion check: python scripts/devops.py check
