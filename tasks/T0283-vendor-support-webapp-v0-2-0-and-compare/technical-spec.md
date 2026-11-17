## Technical Specifications

### Version
- **[Decided]** Vendor support.webapp v0.2.1, as the goal requires.
  Round 1 vendored v0.2.0: at about 18:45Z on 2026-11-17, v0.2.1 had no tag, release, or npm package.
  Tag `v0.2.1` (commit c2e7347, 18:44:32Z) reached the sibling and origin during that turn; review round 1 caught it.
- v0.2.0 to v0.2.1 changes one shipped file: `css/reset.css` paints `:focus-visible` and `.is-focus` outlines in `Highlight` under forced colors.
- Source: `git -c core.autocrlf=false archive v0.2.1` of the sibling checkout, as [devops.md](../../../docs/devops.md) prescribes.

### Declared Files
- docs/specs/visual-style-guide.md
- src/css/app-chrome.css
- src/css/app-components.css
- src/css/views.css
- src/service-worker.js
- tests/e2e/behaviors-dialog.spec.js
- tests/e2e/bin-settings.spec.js
- tests/e2e/gallery-app.spec.js
- tests/e2e/gallery-chrome.spec.js
- tests/e2e/gallery-controls.spec.js
- tests/e2e/gallery-danger.spec.js
- tests/e2e/shell.spec.js
- tests/unit/design-system.test.js
- Added, uncounted: tests/e2e/focus.spec.js, tests/e2e/focus-indicator.js.

Mechanical command: node {{support-webapp-v0.2.1}}/bin/cli.mjs vendor --look neutral --to src/vendor/design
Mechanical files: src/vendor/design/**, design.json
Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json
Mechanical command: python -m ruff format tests/test_draw_wireframes.py
Mechanical files: tests/test_draw_wireframes.py

Size estimate: 13 files, 175 lines; measured after review round 2: 13 files, 179 lines
Size note: 13 counted files exceed the typical 8; most are one-line test adaptations to the new focus glow and shell contract.
The vendored copy cannot merge alone: it breaks the precache, focus, and shell tests, so they change together.
The two stale tests and the Ruff reformat failed the completion check on main e5c72a2, so this task fixes them.

### Adaptations
- Focus: the package now draws a glow on `box-shadow` with a transparent outline.
  - Task rows draw `--focus-glow-inset`; the open link draws none, and the glow skips the row's shadow transition.
  - List rows, group header toggles, and bottom bar items draw `--focus-glow-inset`.
  - Active filter chips and the current bottom bar item layer the glow over their inner box-shadow edges.
  - Panel separators keep their focus line only.
  - Under forced colors, focused task rows paint their outline in `Highlight`, which v0.2.1's `:focus-visible` rule cannot reach.
- Shell: the top bar and action bar span every wide column.
  - Separators take the `sidebar` and `panel` grid areas, so they stay between the bars.
  - The account panel keeps one `--gutter` to both window edges, since the button now ends one gutter in.
  - The add bar follows the package and spans the action bar between gutters.
- **[Decided]** No `app__nav-toggle`: the rail would show blank list items, which have no icons; needs its own design.
  **[Feedback Needed]** Confirm leaving the toggle out; a follow-up task can design the rail.
- **[Decided]** The brand stays at the sidebar top; the top bar starts with the route title.

### Tests
- Integration: focus.spec.js checks that a focused task row's forced colors outline matches `Highlight`, as a package control's does.
- Unit: design-system.test.js pins 0.2.1; precache.test.js requires the three new component partials.
- Integration: focus.spec.js checks inset glows on rows, group headers, bottom bar items, and list rows at 390 and 1440 px, in both themes.
- Integration: focus.spec.js checks that both separators sit between the top bar and the action bar, without a glow.
- Integration: gallery focus checks now require a visible glow or outline in the focus or danger color.
- Integration: shell.spec.js checks the full-width bars, the user button on the content edge, and the account panel gutters.

Completion check: python scripts/devops.py check
