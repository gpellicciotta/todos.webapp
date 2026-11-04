## Technical Specifications

### Declared Files
The files are listed in this task's Execution Log once the split snapshots exist; about 420 lines across the store, toast, shell, and row CSS.

Size estimate: 10 files, 420 lines

### Tests
- Unit: a throwing subscriber never fails a committed write, and every facade write notifies subscribers.
- Unit: Ctrl or Cmd+Z runs only Undo actions, never a Reload, and not while a modal is open.
- Integration: a route change moves focus to main or announces the route, and the Reload offer stays as a banner.

Completion check: `npm test && npm run lint && npm run test:e2e && npm run check:sw`
