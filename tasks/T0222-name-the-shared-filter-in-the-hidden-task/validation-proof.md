## Walkthrough & Validation

### Failing tests before the change
`npx vitest run tests/unit/query.test.js tests/unit/all-tasks.test.js` exited 1.

```
Expected: "Task added. Due: today and Shared: yes hides it."
Received: "Task added. Due: today hides it."
AssertionError: expected [] to deeply equal [ 'shared' ]
Tests  2 failed | 90 passed (92)
```

### After the change
`npx vitest run tests/unit/query.test.js tests/unit/all-tasks.test.js` exited 0.

```
Test Files  2 passed (2)
Tests  92 passed (92)
```

`npm test` exited 0.

```
Test Files  60 passed (60)
Tests  1589 passed (1589)
```

`npm run lint` exited 0 with no findings.

`npx playwright test tests/e2e/sharing.spec.js` exited 0.

```
ok 6 [chromium] › tests\e2e\sharing.spec.js:200:1 › a task added under Shared: yes names the filter in the toast, and Show reveals it (TV-7)
7 passed (8.9s)
```
