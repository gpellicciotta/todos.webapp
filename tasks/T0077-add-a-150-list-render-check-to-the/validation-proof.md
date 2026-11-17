# Validation proof

## Walkthrough & Validation

Command: `npx playwright test --config playwright.perf.config.js --grep "Lists opens"` (exit 0), on the branch equal to main after T0269.

```text
4x CPU throttling, 150 lists: Lists open 179, 161, 163 ms (median 163 ms)
4x CPU throttling, 500 lists: Lists open 378, 340, 340 ms (median 340 ms)
3 passed (52.2s)
```
