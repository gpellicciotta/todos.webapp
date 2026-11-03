## Technical Specifications

### Approach
- **[Decided]** A Python script draws the SVGs, so they are mechanical output and leave the size count.
  Hand-drawn SVGs would reach about 3000 lines, past three times the 900-line estimate.
- The script uses the standard library only and writes one SVG per screen.
- Wireframes use grays, plain boxes, and a generic sans-serif font; no design system colors or fonts.
- Status icons keep their distinct shapes, since the design relies on them.

### Screens
- `first-launch.svg`: All tasks in local mode with the empty state.
- `all-tasks.svg`: All tasks with rows, filters, sort, and the add bar.
- `list.svg`: one list in manual order, with order buttons and drag handles.
- `lists.svg`: lists overview.
- `task-editor.svg`: the task editor, full screen and as a right panel.
- `list-editor.svg`: the list editor panel, with its Sharing section.
- `recycle-bin.svg`: the recycle bin with an in-row confirmation.
- `settings.svg`: settings in local mode.
- `sync-log.svg`: the sync log.
- `connect.svg`: the connect screen during the local data upload.
- `import.svg`: the import dialog with mode choice and counts.

### Declared Files
- scripts/draw-wireframes.py
- tests/test_draw_wireframes.py
- docs/specs/ui-design.md
- docs/devops.md
- CHANGELOG.md

Mechanical command: `python scripts/draw-wireframes.py docs/img/ui`
Size estimate: 5 files, 800 lines, plus 11 generated SVG files

### Tests
- Unit: the script writes exactly the 11 listed SVG files into a given directory.
- Unit: each SVG parses as XML, with a white background and the two labeled frames.
- Unit: every shape and text box of a frame lies inside that frame, so nothing overflows 390 px.
- Unit: each SVG uses only gray fill and stroke colors.
- Integration: running the script twice produces byte-identical files.

Completion check: `python -m pytest tests`, then human review of the SVGs.
