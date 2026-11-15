### Declared Files
- src/js/views/task-list.js
- src/css/views.css
- tests/unit/list.test.js
- tests/e2e/list.spec.js
- docs/specs/ui-design.md

### Requirements
- Header is rendered by `renderHeader` in `task-list.js` and styled by `.group-header` in `views.css`.
- Padding: replace `padding-inline: var(--space-1)` with a larger token, such as `--space-3`.
- Count: "n of m" when n < m, where n is the visible task count and m the group's unfiltered total; plain "m" otherwise.
- Count text must be exposed accessibly, for example "6 of 10 tasks".
- Collapse: the whole group (header plus rows) toggles from the header, which becomes a button with `aria-expanded`.
- Keep the header at a fixed block size, since the list virtualizes by height.
- Collapse must work with keyboard (Enter and Space) and with the virtualized row window.
- Collapsed state survives re-render and filter changes; persistence across reloads is decided in the Decide step.

### Tests
- Unit: header shows "n of m" only when a filter hides tasks and plain total otherwise.
- Unit: toggling a group removes its rows from the rendered window and flips `aria-expanded`.
- Unit: collapsed state survives a re-render and a filter change.
- Integration: e2e filters a grouped list, checks the "6 of 10" style count, then collapses and expands a group by mouse and keyboard.

Completion check: `npm run test:unit` and the list e2e spec pass.

### Execution Notes
- Undeclared files touched: `src/js/core/query.js`, `src/js/views/list.js`, `src/js/views/all-tasks.js`, `src/service-worker.js`.
- Also touched: `tests/unit/query.test.js`, `tests/unit/task-list.test.js`, `tests/unit/all-tasks.test.js`, `tests/e2e/all-tasks.spec.js`.
- Also touched: `docs/requirements.md`, `docs/specs/visual-style-guide.md`, `scripts/draw-wireframes.py`.
- `tests/unit/list.test.js` needed no change; its grouped test still passes.

Size note: 15 counted files and 427 lines; one header element, its count source, tests, and docs cannot merge apart.
Mechanical command: `python scripts/draw-wireframes.py docs/img/ui` (keeps only `docs/img/ui/view-options.svg`).
Mechanical command: `node scripts/check-sw-version.mjs --update` (rewrites `scripts/sw-precache-hashes.json`).
