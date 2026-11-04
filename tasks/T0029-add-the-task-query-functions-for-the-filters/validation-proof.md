## Walkthrough & Validation

The query module and its tests were parked on `wip/T0013-ordering` and taken over here.
New tests cover Due filter boundaries, multi-note search, and queries over the real store.
The adaptation to T0013 and T0014: `indexMemberships` takes the live list ids,
so memberships of deleted lists drop out, and `overdue` reuses `isOverdue` from overdue.js.

### Red Phase

Tests taken over without query.js:

Command: `npx vitest run tests/unit/query.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/query.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/query.test.js [ tests/unit/query.test.js ]
Error: Cannot find module '../../src/js/core/query.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/query.test.js
 ❯ tests/unit/query.test.js:4:1
      2| import { isOverdue } from '../../src/js/core/overdue.js';
      3| import { freshStore } from './store-helpers.js';
      4| import {
       | ^
      5|   DEFAULT_FILTER,
      6|   DEFAULT_ORDER,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  15:44:41
   Duration  342ms (worker 97%, environment 3%)
```

With the parked query.js, before the adaptation:

Command: `npx vitest run tests/unit/query.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/query.test.js (33 tests | 2 failed) 85ms
   ❯ manual order (3)
     × skips memberships of lists outside the given live lists 9ms
   ❯ queries over the local store (1)
     × matches the store manual order and leaves out deleted tasks and lists 20ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/query.test.js > manual order > skips memberships of lists outside the given live lists
AssertionError: expected [ …(2) ] to deeply equal [ Array(1) ]

- Expected
+ Received

  [
    "019a4e00-0000-7000-8000-00000000000a",
+   "019a4e00-0000-7000-8000-00000000000b",
  ]

 ❯ tests/unit/query.test.js:274:29
    272|   it('skips memberships of lists outside the given live lists', () => {
    273|     const index = indexMemberships(memberships, [HOME]);
    274|     expect(index.get('t3')).toEqual([HOME]);
       |                             ^
[... 23 lines omitted ...]

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 31 passed (33)
   Start at  15:44:43
   Duration  459ms (import 44%, tests 35%, transform 18%, worker 3%)
```

### Green Phase

Command: `npx vitest run tests/unit/query.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  1 passed (1)
      Tests  33 passed (33)
   Start at  15:45:07
   Duration  409ms (import 41%, tests 32%, transform 24%, worker 3%)
```

Command: `npx vitest run tests/unit/query.test.js -t performance --silent=false` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

stdout | tests/unit/query.test.js > performance > filters and sorts 5000 tasks in under 50 ms
filter+sort of 5000 tasks: 8.4 ms, 1542 results


 Test Files  1 passed (1)
      Tests  1 passed | 32 skipped (33)
   Start at  15:45:09
   Duration  343ms (import 55%, tests 22%, transform 19%, worker 3%)
```

Command: `npx eslint src/js tests/unit/query.test.js` (exit code 0)

```text
(no output)
```

Command: `npx vitest run tests/unit/fractional-index.test.js tests/unit/store-*.test.js tests/unit/bin.test.js tests/unit/overdue.test.js tests/unit/uuid7.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  7 passed (7)
      Tests  157 passed (157)
   Start at  15:45:14
   Duration  789ms (import 48%, tests 39%, transform 9%, worker 4%)
```
