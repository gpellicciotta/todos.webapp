# Validation proof

## Walkthrough & Validation

Command: `npx playwright test --config playwright.perf.config.js --grep "Lists opens"` (exit 1)

```text
4x CPU throttling, 150 lists: Lists open 386, 376, 438 ms (median 386 ms)
4x CPU throttling, 500 lists: Lists open 680, 720, 699 ms (median 699 ms)
Expected: < 200
Received:   393.80000001192093 (first run)
1 failed, 2 passed
```
