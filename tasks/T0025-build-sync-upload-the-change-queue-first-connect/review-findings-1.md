---
task: T0025
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-07T19:40:35Z
reviewed_commit: "578da7d"
base_commit: "6dd6887"
branch: task/T0025-build-sync-upload-the-change-queue-first-connect
---
# Review Findings: Task T0025 (Round 1)

## Summary
The change queue, API client, upload engine, rollback logic, tab leadership, and version 4 store migration are well-designed and pass all 962 unit tests and ESLint checks. However, first-connect adoption does not sort memberships by `position` before uploading, and `docs/specs/local-store.md` fails `lint-markdown` table alignment and sentence-length checks.

## Defects
- In [adopt.js](../../../src/js/sync/adopt.js), `planSteps` reads `data.memberships` from `store.snapshot()`, which returns records in IndexedDB key order (`[list-id, task-id]`) rather than `position` order. Because `runStep` uploads each membership with `{}` (appending to the end of the list), any local list whose tasks were reordered loses its manual order on first connect.

## Process Gaps
- `lint-markdown check docs/specs/local-store.md` fails at line 206 (`MD017 [aligned-tables]`: table pipes are not vertically aligned).
- Several new sentences in [local-store.md](../../../docs/specs/local-store.md) (lines 196, 211, 216, 221) and [CHANGELOG.md](../../../CHANGELOG.md) (lines 22–24) exceed the 20-word sentence limit.

## Required Rework
- Sort `data.memberships` in `planSteps` inside [adopt.js](../../../src/js/sync/adopt.js) by `list-id`, then ascending `position` (and `task-id` on ties) before creating `membership` upload steps, and add a test in [adopt.test.js](../../../tests/unit/adopt.test.js) verifying that reordered tasks keep their manual order after adoption.
- Align the table in [local-store.md](../../../docs/specs/local-store.md) so `lint-markdown check CHANGELOG.md docs/specs/local-store.md` passes, and trim sentences in [local-store.md](../../../docs/specs/local-store.md) and [CHANGELOG.md](../../../CHANGELOG.md) to at most 20 words.

