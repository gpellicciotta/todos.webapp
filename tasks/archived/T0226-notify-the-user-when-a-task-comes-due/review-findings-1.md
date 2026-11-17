---
task: T0226
round: 1
verdict: rejected
blocking: 2
reviewer: "@codex"
reviewed_at: 2026-11-17T04:15:00Z
reviewed_commit: "233ea83"
base_commit: "050f27c"
branch: task/T0226-notify-the-user-when-a-task-comes-due
session: codex-20261117-ce8721
session_agent: codex
session_created_at: 2026-11-17T04:13:03Z
---
# Review Findings: Task T0226 (Round 1)

## Summary
**[Decided]** Rejected for two reminder delivery defects.
Reviewed the task, specification, execution evidence, commit history, and complete branch diff.

Independent checks passed, each with exit code 0:

- `npm test`: 62 files, 1617 tests passed.
- `npx playwright test tests/e2e/reminders.spec.js tests/e2e/service-worker.spec.js tests/e2e/bin-settings.spec.js`: 16 passed.
- `npx eslint .`: no diagnostics.
- `npm run check:sw`: 130 precached files match VERSION 2026-11-17.14.

Playwright's managed server exited; no review test process remained.
No implementation files were changed.

## Defects
1. Blocking: history eviction repeats previously delivered reminders, violating REM-7.
   In `src/js/app.js:65-76`, the ledger retains only 500 tags, including tags for tasks still eligible for scheduling.
   `src/js/core/reminders.js:108-121` treats every evicted tag as an undelivered reminder.
   Reproduced using the real scheduler, 501 overdue open tasks, and the application's 500-tag ledger policy.
   Two consecutive checks produced this output:

   ```text
   First check: 501 notifications; 500 retained tags
   Second check total: 502 notifications
   ```

   No task changed between checks. Further checks keep resurfacing evicted reminders, including after reload.
   Startup summaries also evict eligible tags, allowing already summarized tasks to notify again.

2. Blocking: failed notification delivery permanently suppresses that reminder and can stop periodic scheduling.
   `src/js/core/reminders.js:134` records delivery before awaiting `notify`; the summary branch does likewise at line 154.
   A rejected `showNotification` therefore leaves an undelivered reminder permanently recorded as delivered.
   The rejection also bypasses timer installation at lines 163-169.
   The catch reports the error without scheduling another check.
   Reproduced through `createReminders.start()` with one eligible task and a rejecting notification adapter:

   ```text
   {"attempts":1,"timers":0,"ledgerEntries":1}
   ```

   Until another external event triggers a check, later tasks have no timer to deliver their reminders.
   Even after that event, the failed reminder remains suppressed.

## Process Gaps
- Non-blocking: the visual step is checked despite explicitly deferred Firefox and real operating-system notification checks.
  The log transparently identifies these limitations and defers them, along with the wireframe, to T0268.
- Non-blocking: validation output excerpts omit truncation markers required by the testing skill.
  Independent affected checks passed; this evidence-format issue does not determine the verdict.

## Required Rework
1. Preserve deduplication for every reminder that remains eligible; do not evict tags solely because 500 deliveries occurred.
   Add regression coverage exceeding 500 tags, including startup summaries and reload behavior.
2. Record successful delivery only after notification success, retaining failed reminders for retry.
   Ensure every failed check re-arms bounded periodic scheduling and does not strand other due tasks.
   Add rejection-and-recovery tests for individual notifications and summaries.
3. Rerun affected unit and browser checks and record their actual output.
