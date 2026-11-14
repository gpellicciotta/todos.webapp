## Walkthrough & Validation
The fix landed earlier in commit bd249d8: the test asserts only the first three service calls.

```
npx playwright test tests/e2e/connect.spec.js --repeat-each=10
  70 passed (59.4s)
```
