---
task: T0071
round: 1
verdict: rejected
reviewer: "@codex"
reviewed_at: 2026-11-07T23:27:59Z
reviewed_commit: "4db5a35"
base_commit: "92026d5"
branch: task/T0071-add-shared-helpers-to-find-sort-and-count
---
# Review Findings: Task T0071 (Round 1)

## Summary
**[Decided]** Rejected pending unknown-sort handling and the specified count integration coverage.
The helpers otherwise match the documented matching, sorting, counting, and linear traversal requirements.
Independent verification passed: 58 test files, 1163 tests, ESLint, service worker hashes, and Git whitespace checks.

## Defects
- P2: [list-sort.js](../../work/T0071-add-shared-helpers-to-find-sort-and-count/src/js/core/list-sort.js), lines 27–29, retrieves comparators through an ordinary object's prototype chain.
  An unknown sort named `__proto__` throws `TypeError: compare is not a function` with two lists.
  This contradicts the documented fallback that unknown values preserve manual order.
  Reproduced through the actual exported helper:

```javascript
sortLists([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], '__proto__', { byList: new Map() });
```

## Process Gaps
- The specified integration scenario asserting equal sidebar and Lists screen counts is absent.
  Existing layout tests supply an empty count map and assert ordering, without checking nonzero counts.
  Existing Lists tests do not assert task counts.
  Passing these tests therefore does not verify the changed count contract across both consumers.
- [validation-proof.md](validation-proof.md) contains red and green output, but omits required truncation markers and omitted-line counts.
  Its full-suite block contains summary excerpts rather than the required explicitly marked truncation.

## Required Rework
- Restrict comparator lookup to supported own keys, preserving manual order for every unknown sort value.
- Add a failing regression test for `__proto__` before correcting comparator lookup.
- Add the specified integration coverage using shared task and membership fixtures across both rendered consumers.
  Assert nonzero open counts, total counts on Lists, empty lists, shared memberships, and updates after task status changes.
- Rerun relevant tests, lint, and service worker checks after changes.
- Capture verbatim validation output with exact commands, exit codes, and explicit omitted-line markers where truncated.
