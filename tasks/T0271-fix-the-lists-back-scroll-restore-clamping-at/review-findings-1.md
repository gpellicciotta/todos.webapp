---
task: T0271
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T08:45:18Z
reviewed_commit: "2cf4504"
base_commit: "d517663"
branch: task/T0271-fix-the-lists-back-scroll-restore-clamping-at
---
# Review Findings: Task T0271 (Round 1)

## Summary
The Lists regression checks pass, but the router introduces a navigation cancellation defect.
**[Decided]** Reject pending cancellation rework.

Independent checks:
- `npx vitest run tests/unit/router.test.js`: exit 0; 30 tests passed.
- `npm run lint`: exit 0.
- `npx playwright test tests/e2e/lists-many-rows.spec.js --repeat-each=10 --project=chromium`: exit 0; 40 passed (3.0m).

The browser command ran in session 94023 with server PID 35044; completion was awaited and output inspected.
Playwright stopped its server; no descendants remained afterward.

## Defects
- Blocking, P2: Later navigation cannot cancel a clamped restore in `src/js/ui/router.js:164-179`.
  `handle()` awaits restoration, while `onHashChange()` queues the next handler behind that promise.
  Therefore, `current !== route` cannot become true during restoration.
  When saved scroll exceeds available content, sidebar navigation or browser history waits through all 60 frames.
  Inputs outside the scroller do not trigger its cancellation listeners.
  This occurs when content shrinks while another view is open.
  Navigation also remains blocked while animation frames are suspended in a hidden tab.

  A read-only Node probe used the actual exported router, a clamped scroller, and manually controlled animation frames.
  It saved scroll 900, navigated away, reduced maximum scroll to 100, returned, then requested Settings.
  Settings rendered only after all 60 queued frames were drained.
  Verbatim output:
  ```text
  After navigation: {"hash":"#/settings","current":"tasks","rendered":["tasks","bin","tasks"],"pendingFrames":1}
  After draining frames: {"count":60,"current":"settings","rendered":["tasks","bin","tasks","settings"]}
  ```

## Process Gaps
- Non-blocking: The failing-first evidence omits its exact executable command and uses an abbreviated output excerpt without omission markers.
  The completion checklist also lacks dedicated failing-first steps.
  These documentation gaps do not determine the verdict.

## Required Rework
- Cancel pending restoration when a newer navigation arrives, without waiting for the next route handler to update `current`.
- Ensure a paused animation frame cannot prevent newer navigation from rendering.
- Add regression coverage for navigation during an unreachable restore target, including navigation outside the scroller.
- Retain the passing clamping regression and rerun affected router and Lists browser tests.
