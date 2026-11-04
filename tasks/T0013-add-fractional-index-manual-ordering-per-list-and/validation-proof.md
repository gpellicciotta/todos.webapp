## Walkthrough & Validation

### Red Phase

Command: `npx vitest run tests/unit/fractional-index.test.js tests/unit/query.test.js tests/unit/store-tasks.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/fractional-index.test.js (0 test)
 ❯ tests/unit/query.test.js (0 test)
 ❯ tests/unit/store-tasks.test.js (39 tests | 15 failed) 147ms
   ❯ manual order (14)
     × appends created and added tasks after the last task of the list 14ms
     × appends after the last task by position, not by added time 3ms
     × moves a task before or after a neighbor 5ms
     × changes only the moved membership and leaves other lists unchanged 4ms
     × updates the last activity time of the moved task, not its last update time 3ms
     × rejects both neighbors 7ms
     × rejects no neighbor 4ms
     × rejects the task itself as neighbor 3ms
     × rejects a neighbor outside the list 2ms
     × rejects a neighbor that is a member of another list only 2ms
     × fails when the task is not in the list 3ms
     × rebalances the list when the new position would exceed 128 characters 3ms
     × rebalances the list when the neighbors share a position 4ms
     × keeps keys at most 128 characters over 800 moves to the same spot 2ms
   ❯ schema upgrade to version 3 (1)
     × assigns positions to existing memberships in added-time order 2ms

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/fractional-index.test.js [ tests/unit/fractional-index.test.js ]
Error: Cannot find module '../../src/js/lib/fractional-index.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/fractional-index.test.js
 ❯ tests/unit/fractional-index.test.js:2:1
      1| import { describe, expect, it } from 'vitest';
      2| import { keyBetween, keysBetween, MAX_KEY_LENGTH } from '../../src/js/…
[... 171 lines omitted ...]


 Test Files  3 failed (3)
      Tests  15 failed | 24 passed (39)
   Start at  02:29:22
   Duration  845ms (import 34%, transform 30%, tests 27%, worker 9%)
```

### Green Phase

Command: `npx vitest run tests/unit/fractional-index.test.js tests/unit/query.test.js tests/unit/store-tasks.test.js tests/unit/store-lists.test.js tests/unit/store-notes.test.js tests/unit/uuid7.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  6 passed (6)
      Tests  149 passed (149)
   Start at  02:35:00
   Duration  1.04s (tests 43%, import 41%, transform 11%, worker 5%)
```

Command: `npx vitest run tests/unit/query.test.js -t performance --silent=false` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

stdout | tests/unit/query.test.js > performance > filters and sorts 5000 tasks in under 50 ms
filter+sort of 5000 tasks: 8.1 ms, 1542 results


 Test Files  1 passed (1)
      Tests  1 passed | 25 skipped (26)
   Start at  02:35:03
   Duration  307ms (import 38%, tests 37%, transform 19%, worker 6%)
```

Command: `npx eslint src/js tests/unit` (exit code 0)

```text
(no output)
```

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  8 passed (8)
      Tests  242 passed (242)
   Start at  02:35:08
   Duration  1.08s (tests 52%, import 37%, transform 7%, worker 4%)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

### Service Key Compatibility

The service's `FractionalIndex.java` was compiled in a scratch folder with a driver printing keys.

The expected keys in tests/unit/fractional-index.test.js come from this output and the rocicorp vectors.

Command: `javac FractionalIndex.java Driver.java && java Driver` (exit code 0)

```text
null | null -> a0
null | a0 -> Zz
null | Zz -> Zy
a0 | null -> a1
a1 | null -> a2
a0 | a1 -> a0V
a1 | a2 -> a1V
a0V | a1 -> a0l
Zz | a0 -> ZzV
Zz | a1 -> a0
null | Y00 -> Xzzz
bzz | null -> c000
a0 | a0V -> a0G
a0 | a0G -> a08
b125 | b129 -> b127
a0 | a1V -> a1
Zz | a01 -> a0
null | a0V -> a0
null | b999 -> b99
null | A00000000000000000000000000 -> ERROR
null | A000000000000000000000000001 -> A000000000000000000000000000V
zzzzzzzzzzzzzzzzzzzzzzzzzzy | null -> zzzzzzzzzzzzzzzzzzzzzzzzzzz
zzzzzzzzzzzzzzzzzzzzzzzzzzz | null -> zzzzzzzzzzzzzzzzzzzzzzzzzzzV
a00 | null -> ERROR
a00 | a1 -> ERROR
0 | 1 -> ERROR
a1 | a0 -> ERROR
az | null -> b00
Zz | a0 -> ZzV
n(null,null,5) [a0, a1, a2, a3, a4]
n(null,a0,5) [Zv, Zw, Zx, Zy, Zz]
n(a0,a1,5) [a08, a0G, a0V, a0d, a0l]
n(a5,b07,10) [a58, a5G, a5V, a5d, a5l, a6, a6G, a6V, a7, a8]
after1000 len=169 a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004
append1000 bF7
```
