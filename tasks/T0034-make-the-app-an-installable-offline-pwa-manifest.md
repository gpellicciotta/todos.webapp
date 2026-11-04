---
id: T0034
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T16:24:42Z"
ended_at: "2026-11-04T16:27:04Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@claude-review-agent"
completion-commit: 5b6bb35be864373d40eb35ecd78c3712defbb95c
---
# T0034: Make the app an installable offline PWA: manifest, app icons, versioned service worker precache, and offline tests

## Goals
Add the web app manifest and app icons, so the app is installable (`TEC-1`).
Add a versioned service worker that precaches the app shell and serves it offline, with no cross-origin requests (`LOC-3`).
A test fails when a file the app needs is missing from the precache list.
Split from T0015 on 2026-11-04 for size; the code was written during T0015.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the parked code written during T0015 and the review follow-ups it covers.
- [x] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [x] **[Verify]**    Run the tests without the implementation, confirm they fail, and record the output.
- [x] **[Implement]** Take over the implementation from the T0015 working tree.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Implement]**
  Took over the manifest, icons, service worker, and precache tests from T0015; offline checks moved to pwa.spec.js.
  - Files touched: 9, adding src/index.html and src/js/app.js.
  - Lines touched: 312, against a 300-line estimate.
  - Red against stage 3; green at stage 4.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 rejected by @claude-review-agent: Precache install goes through the HTTP cache, so stale files can pin under a new version; use cache reload requests.

- [2026-11-04] **[Review]**
  Round 1 rejected for HTTP-cache stale installs; fixed with cache reload requests and a behavioral test, then approved.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 10.
  - Lines touched: 353.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 2 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

