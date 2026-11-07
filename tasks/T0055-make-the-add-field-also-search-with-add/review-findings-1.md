---
task: T0055
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-07T13:58:38Z
reviewed_commit: "c40da28"
base_commit: "25279d5"
branch: task/T0055-make-the-add-field-also-search-with-add
---
# Review Findings: Task T0055 (Round 1)

## Summary
The implementation in `add-bar.js`, `all-tasks.js`, `list.js`, and `query.js` meets the functional goals for search-and-add (`VO-3`, `VO-14`, `TV-6`, `TSK-1`), and all 38 unit test files, 25 Playwright end-to-end tests, ESLint, and service-worker checks pass. However, two verification artifacts violate the Testing Guidelines: the no-match screenshots were captured before the 150 ms debounce settled (so they do not depict the no-match state), and `validation-proof.md` uses reconstructed/paraphrased lines instead of verbatim terminal output with explicit `[... {{n}} lines omitted ...]` truncation markers.

## Defects
None in production code.

## Process Gaps
- **No-match screenshots do not show the no-match UI**: `after-compact-no-match.png` and `after-wide-no-match.png` show `"nothing like this"` typed in the input, but the info line still reads `1 of 4 tasks · Search: buy paint for the hallway · Status: open`, the task row `Buy paint for the hallway` is still rendered, and the hint still reads `Add creates a new task "buy paint for the hallway".` The screenshots were taken before the 150 ms search debounce fired (or without pressing `Enter` / waiting for `.add-hint` to equal `No task matches. Add creates it.`).
- **Non-verbatim output in `validation-proof.md`**: Per `testing-guidelines` (`## Execution Evidence`), each verification block must precede verbatim terminal output with the exact command line and exit code, and mark any truncation with `[... {{n}} lines omitted ...]`. In `validation-proof.md`, the `npx vitest run` red-phase block, `npm run lint` / `npm run check:sw` combined block, and `npm run test:perf` block contain hand-summarized lines rather than verbatim terminal output with truncation markers.

## Required Rework
1. Re-capture `after-compact-no-match.png` and `after-wide-no-match.png` after the search filter has applied (e.g., wait for `.add-hint` to display `No task matches. Add creates it.` and `.task-row` count to be `0`).
2. Update `.plan/tasks/T0055-make-the-add-field-also-search-with-add/validation-proof.md` so every command has its own exact command line, exit code, and verbatim terminal output block (using `[... {{n}} lines omitted ...]` whenever lines are omitted, capped at 40 lines per block).

