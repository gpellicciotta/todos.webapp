---
task: T0250
round: 1
verdict: rejected
blocking: 3
reviewer: "@gemini"
reviewed_at: 2026-11-17T01:14:32Z
reviewed_commit: "203b796"
base_commit: "d459342"
branch: task/T0250-let-task-lists-the-lists-screen-and-the
---
# Review Findings: Task T0250 (Round 1)

## Summary
The CSS width rules in views.css and documentation updates work as intended across row and reading views.
Rejected for two failing CI checks (`npm run check:sw` and `npm run lint`) and an incomplete row width E2E assertion.

## Defects
- Blocking: `npm run check:sw` fails because `css/views.css` changed while `VERSION` in service-worker.js and sw-precache-hashes.json stayed at `2026-11-17.4`.
- Blocking: `npm run lint` fails with `@stylistic/comma-dangle` (`Missing trailing comma`) at line 60 of shell.spec.js.
- Blocking: shell.spec.js measures view wrappers on an empty bin instead of long rows across all four screens per [technical-spec.md](technical-spec.md).

## Process Gaps
- Non-blocking: [validation-proof.md](validation-proof.md) summarizes test runs instead of pasting verbatim command output and exit codes, and mixes CRLF with LF.
- Non-blocking: Line 5 of views.css still states that the main column centers every view at `--width-main`.
- Non-blocking: The task Execution Log retains an earlier entry stating screenshots were not captured and omits task outcomes.
- Non-blocking: New sentences in ui-design.md (line 118), visual-style-guide.md (line 145), and CHANGELOG.md slightly exceed the 20-word cap.

## Required Rework
- Bump `VERSION` in service-worker.js, run `node scripts/check-sw-version.mjs --update`, and confirm `npm run check:sw` passes.
- Add the missing trailing comma in shell.spec.js and confirm `npm run lint` passes.
- Seed a long task row and a binned row in shell.spec.js, and assert `.task-row`, `.list-row`, and `.bin-row` exceed `720` px.
