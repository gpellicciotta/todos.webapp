### Declared Files
- src/js/views/list-actions.js
- src/js/views/lists.js
- src/js/views/list.js
- src/css/views.css
- src/service-worker.js
- tests/unit/lists.test.js
- tests/e2e/lists.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- CHANGELOG.md

### Decisions
- **[Decided]** The More menu moves to a shared module used by the List screen header and the Lists rows.
- **[Decided]** Alt+Up and Alt+Down stay as the keyboard way to reorder; only the buttons go.
- **[Decided]** The grip shows on touch screens too, since it is now the only pointer way to reorder.
- **[Decided]** Delete list from a row opens All tasks with the Undo toast, as in the List screen.
- The wireframe lists.svg is not redrawn: no Python is installed on this machine; follow-up needed.

### Tests
- Unit: rows have a grip and a More button named List actions plus the list name, and no Move up or Move down buttons.
- Unit: the row menu holds Edit list, Edit view options, Share list, and Delete list, and opens the matching routes.
- Unit: Delete list asks first and then removes the list; Alt+Up and Alt+Down still reorder and announce.
- Integration: end-to-end, the More button opens the list editor and the view options; Alt+Down and Alt+Up reorder the rows and the sidebar.

Completion check: `npm test` and `npx playwright test`
