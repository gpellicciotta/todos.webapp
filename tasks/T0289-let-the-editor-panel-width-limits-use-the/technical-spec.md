## Technical Specifications

### Current Behavior
- `otherOf('editor')` returns `widths.sidebar`, the open width, whatever the nav state.
- `limitsOf('editor', otherRem, viewportRem)` caps the editor at `viewportRem - MAIN_MIN - otherRem`, within 20 to 40rem.
- From 64rem, `attachAppNav` cycles the sidebar through open, rail, and hidden (T0287); `todos.view.nav` stores it.
- The rail narrows the sidebar to the vendored `--_app-rail-track`; hidden sets the sidebar's `hidden` attribute.

### Change
- **[Decided]** Measure the sidebar's rendered inline size in rem, 0 when hidden, instead of computing the rail track.
  The measurement follows the vendored track if the package changes it.
- Use that shown width only for the editor's limits; the sidebar separator is hidden in the rail and hidden states.
- **[Decided]** Observe the sidebar `hidden` attribute and the toggle's `aria-expanded` instead of calling `refresh` from layout.js.
  The observer also catches media changes, which re-render the toggle without `onChange`; layout.js stays unchanged.
- Clamp the applied editor width again after each state change; keep the stored desired widths unchanged.
- **[Decided]** Reopening the sidebar follows the existing rule that the sidebar yields first.
  At 1100 px with a 40rem editor, the reopened sidebar shows 12rem and the editor 32.75rem; a wider window restores both.

### Declared Files
- src/js/ui/panel-resize.js
- src/service-worker.js
- tests/unit/panel-resize.test.js
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md

Size estimate: 5 files, 120 lines

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Tests
- Unit: with a rail sidebar of 4rem at 68.75rem, the editor's maximum is 40rem; open at 16rem it is 28.75rem.
- Unit: with a hidden sidebar, the editor's limits ignore the stored sidebar width.
- Unit: a nav state change refreshes the separators' `aria-valuemax` and reclamps the applied editor width.
- Integration: shell.spec.js at 1100 px opens a task, switches to the rail, presses End on the editor separator, and finds 40rem.
- Integration: shell.spec.js reopens the sidebar and finds the editor clamped back; at 1440 px both stored widths show again.

Completion check: python scripts/devops.py check
