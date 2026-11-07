## Walkthrough & Validation

### Changes
- All tasks defaults to Created descending; list views keep Manual order.
- Add opens the task editor of the new task and the add bar skips its refocus.
- Tests, requirements TV-13 and TSK-13, the UI design, CHANGELOG.md, and the service worker version follow.

### Tests failed first (filtered with grep for × lines)
```text
npx vitest run tests/unit/query.test.js tests/unit/view-controls.test.js tests/unit/list.test.js tests/unit/all-tasks.test.js tests/unit/add-bar.test.js
     × defaults to creation time descending, so a new task comes first 21ms
     × leaves focus alone when onAdd resolves false, because focus moved elsewhere 81ms
     × starts with the open status filter and created newest first, or manual order in a list view 20ms
     × accepts manual order in a list view only 2ms
     × adds the sort only when it differs from the default 1ms
     × opens the task editor of a new task and leaves focus to the editor 1020ms
     × opens the task editor of a new task in this list and leaves focus to the editor 1027ms
 Test Files  5 failed (5)
      Tests  7 failed | 122 passed (129)
```

### Tests pass after the change
```text
npx vitest run
 Test Files  38 passed (38)
      Tests  854 passed (854)

npx eslint .
(no output, exit 0)

npx playwright test --reporter=line
  158 passed (1.6m)

npm run check:sw
OK: 56 precached files match VERSION 2026-11-07.10.
```
