---
task: T0287
round: 1
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-17T22:05:14Z
reviewed_commit: "a73c4fc"
base_commit: "5745ebb"
branch: task/T0287-design-and-add-the-app-nav-toggle-with
---
# Review Findings: Task T0287 (Round 1)

## Summary
Approved.
The top bar opens with the vendored `app__nav-toggle`, and `attachAppNav` drives the `app-nav` popover sidebar.
From 64rem the toggle cycles open, rail, and hidden; `todos.view.nav` stores the state per device.
The rail shows each list as a grapheme-aware monogram, hides find and the separator, and clears the find text.
Every decision in technical-spec.md matches the code, the docs, and the gallery specimen.

Reviewer runs on commit a73c4fc:
- `npx eslint .`: exit 0.
- `node scripts/check-sw-version.mjs`: 142 precached files match VERSION 2026-11-17.38.
- `node src/vendor/design/bin/check.mjs`: integrity and conformance PASS.
- `npx vitest run`: 66 files, 1763 tests passed.
- `npx playwright test`: 273 passed (3.6m).
- `plan tasks validate T0287 --completion`: passed.

Screenshots of the rail (light and dark), the hidden state, and the gallery specimen match the design.
The `l` shortcut still falls back to the Lists screen in the rail, since `app.js` checks `getClientRects()`.

## Defects
None.

## Process Gaps
- Two lists that start with the same letter show the same monogram, such as Garden and Groceries.
  The `title` tooltip and the accessible names tell them apart, so this is a design trade-off, not a defect.
- The size estimate said 13 files and 450 lines; the work touched 16 files and 418 lines.
  The Execution Log records the three undeclared files and the size note.

## Required Rework
None.
