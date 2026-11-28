## Walkthrough & Validation

Before the fix, `npm run test:e2e` on the task branch (exit code 1): 6 failed, 293 passed.
The two task-editor failures from the task goals no longer failed on this base.
All six failures were outdated tests; no product defect was found.

| Test                                          | Cause                                                                              | Fix                                               |
| :-------------------------------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------ |
| all-tasks view options (390 and 1440 px)      | The Status filter gained Failed, so cancelling one status leaves 4                 | Expect the Failed box and "4 statuses"            |
| all-tasks add-hidden toast                    | Completed alone needs Failed unchecked too                                         | Uncheck Failed as well                            |
| list filters                                  | Same Failed status                                                                 | Expect "4 statuses"                               |
| backup 2/3 round trip                         | ADR-0006 stores a complete tick as a `log` event                                   | Expect `log` events                               |
| store-upgrade                                 | The v5 fixture had counts without events; the v6 fold rebuilds counts from events | Seed one `complete` event per counted tick        |

### `npm run test:e2e` (exit code 0)

```text
  299 passed (4.2m)
```

### `npm test` (exit code 0)

```text
 Test Files  72 passed (72)
      Tests  2011 passed (2011)
```
