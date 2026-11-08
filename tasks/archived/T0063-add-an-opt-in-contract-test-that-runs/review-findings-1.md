---
task: T0063
round: 1
verdict: approved
reviewer: "@gemini"
reviewed_at: 2026-11-07T20:22:41Z
reviewed_commit: "4af567f"
base_commit: "70200c3"
branch: task/T0063-add-an-opt-in-contract-test-that-runs
---
# Review Findings: Task T0063 (Round 1)

## Summary
Approved. The opt-in contract test suite in `tests/contract/sync.contract.test.js` and its server helper in `tests/contract/server.js` cleanly start and stop a real todos `--memory-db` server via `devops.py` with a local Auth stand-in. The suite verifies sign-in, first-connect adoption, same-named list merge, two-device field merge and conflict logging, purged-list tombstones, `410` cursor expiry recovery, and `426` minimum version enforcement. Running against the real server uncovered a genuine callback response format drift (`exchangeCode` now reads the JSON `one-time-passcode` while retaining the redirect fallback) and an in-memory server user-lookup defect on notes (documented as `it.fails` and tracked in todos task T0207). All unit tests (`1020 passed`), contract tests (`6 passed | 1 expected fail` with `TODOS_SERVER_DIR`, `7 skipped` without), ESLint, service worker precache checks, and `plan tasks validate` pass.

## Defects
None

## Process Gaps
None

## Required Rework
None

