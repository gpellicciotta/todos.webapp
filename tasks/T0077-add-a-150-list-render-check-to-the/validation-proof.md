# Validation proof

## Walkthrough & Validation

Command: `npm run test:perf` (exit 1), on the branch with no net diff against main (cf9fec7).

```text
4x CPU throttling: view open 257, 274, 279 ms (median 274 ms)
grouped by due date, 4x CPU throttling: view open 269, 270, 287 ms (median 270 ms)
4x CPU throttling, 150 lists: Lists open 156, 158, 160 ms (median 158 ms)
4x CPU throttling, 500 lists: Lists open 377, 357, 364 ms (median 364 ms)
4x CPU throttling, 12 lists: ungrouped median 312 ms; grouped by list median 342 ms
2 failed (All tasks 273.8 ms, grouped by due date 269.7 ms; limit 200 ms)
3 passed (1.6m)
```

Command: `npx playwright test --config playwright.perf.config.js --grep "All tasks"` (exit 1) at e173243, before T0269.

```text
4x CPU throttling: view open 332, 292, 282 ms (median 292 ms)
grouped by due date, 4x CPU throttling: view open 323, 315, 311 ms (median 315 ms)
2 failed
```
