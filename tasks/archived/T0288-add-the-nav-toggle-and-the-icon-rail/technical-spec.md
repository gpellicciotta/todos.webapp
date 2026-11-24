## Technical Specifications

### Notes
- The script draws low-fidelity grays only, never design system values; keep that.
- Wide frames draw the sidebar through `sidebar()` and `sidebar_many()`; neither draws a nav toggle or a rail today.
- Since T0254, the toggle glyph shows the next step: collapse while open, hide in the rail, menu while hidden.
  Draw a plain three-line glyph or a simple arrow; the caption names the step.
- The rail shows destination glyphs and list monograms in one column; labels show only as a hover tooltip.
- Rerunning the script must reproduce every SVG byte for byte.

### Declared Files
- scripts/draw-wireframes.py
- tests/test_draw_wireframes.py
- docs/specs/ui-design.md
- Added, uncounted: docs/img/ui/nav-rail.svg

Mechanical command: python scripts/draw-wireframes.py docs/img/ui
Mechanical files: docs/img/ui/*.svg

Size estimate: 3 files, 160 lines

### Tests
- Unit: test_draw_wireframes.py checks that `SCREENS` lists `nav-rail.svg` and each wide frame draws the toggle.
- Unit: test_draw_wireframes.py checks that the rail frame draws monograms and no list names outside the tooltip.
- Integration: running the script twice into temporary folders writes identical files, matching docs/img/ui.

Completion check: python scripts/devops.py check
