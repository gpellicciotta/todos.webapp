---
id: T0077
owner: "@claude"
session: claude-20261117-e11e57
needs: []
branch: task/T0077-add-a-150-list-render-check-to-the
worktree: .plan/work/T0077-add-a-150-list-render-check-to-the
status: active
started_at: "2026-11-17T05:08:32Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 484.8, input: 70, output: 11360, cache_read: 2680830, cache_write: 138946}
  review: {turns: 1, duration_s: 163.7, input: 37232, output: 2330, cache_read: 650368, cache_write: 0}
work_duration: 4855.9
review_status: rejected
review_round: 1
review_requested_at: "2026-11-17T06:23:15Z"
reviewed_by: "@codex"
review_session: codex-20261117-3fb6e9
---
# T0077: Add a 150-list render check to the performance spec, and record 500 lists

## Goals
Add a render check to the performance spec: opening Lists with 150 lists and 5000 tasks takes at most 200 ms under 4x CPU throttling.
Also record the 500-list time without asserting it, as ui-design.md, Many Lists, decides (`TEC-16`).
Update the measured numbers in ui-design.md.

## Task Execution Steps
- [x] **[Implement]** Add the 150-list test and the 500-list recording to performance.spec.js, seeded with 5000 tasks.
- [x] **[Verify]**    Run `npm run test:perf` and record the 150-list and 500-list times.
- [x] **[Doc]**       Write the measured times into ui-design.md and note a windowing follow-up if 500 passes twice 150.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Verify]**
  150-list open takes about 386 ms under 4x throttling, over the 200 ms budget; 500 lists take about 699 ms.
  - Reproduced in two runs.
  - Lists screen needs optimizing first.

- [2026-11-17] **[Implement]**
  T0269 already added the 150-list check, 500-list recording, docs, and changelog; reverted my duplicate commit.
  - Branch tree equals main.
  - 500 lists is 2.09x the 150-list time.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 0.
  - Lines touched: 0.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 rejected by @codex: [Decided]** Rejected because the specified completion check failed, although both target Lists checks passed.
  - Findings: [review-findings-1.md](T0077-add-a-150-list-render-check-to-the/review-findings-1.md).

- [2026-11-17] **[Verify]**
  Full npm run test:perf fails on two All tasks checks (274 and 270 ms); they fail before T0269 too, so not a regression here.
  - Lists checks pass: 158 ms and 364 ms.
  - Human decision needed on narrowing completion check.

- [2026-11-17] **[Verify]**
  Full npm run test:perf passes after T0272: 150 lists open in 161 ms, 500 lists in 375 ms.
  - 500 lists is 2.3x the 150-list time.
  - Files touched: 0; lines touched: 0; reopenings: 0.

