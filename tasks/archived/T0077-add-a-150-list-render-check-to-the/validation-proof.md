# Validation proof

## Walkthrough & Validation

Command: `npm run test:perf` (all 5 tests passed, 1.4m), on the branch rebased onto main d517663 with T0269 and T0272 merged.

```text
4x CPU throttling: view open 176, 151, 143 ms (median 151 ms)
grouped by due date, 4x CPU throttling: view open 117, 114, 112 ms (median 114 ms)
4x CPU throttling, 150 lists: Lists open 162, 161, 160 ms (median 161 ms)
4x CPU throttling, 500 lists: Lists open 365, 377, 375 ms (median 375 ms)
4x CPU throttling, 12 lists: ungrouped median 104 ms; grouped by list median 124 ms
5 passed (1.4m)
```
