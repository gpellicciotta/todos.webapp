---
task: T0264
round: 1
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-17T15:05:47Z
reviewed_commit: "6e7baf1"
base_commit: "fa3d9b4"
branch: task/T0264-redesign-the-task-row-as-a-description-line
---
# Review Findings: Task T0264 (Round 1)

## Summary
Approved. Commit 6e7baf1 meets every goal and the technical spec, and matches the Task Row Layout in T0257's brief.
- The description clamps to 2 lines; the buttons stay on the first row height.
- Above target 1, the status button holds an `aria-hidden` count badge with the status tint.
- The meta line holds due or repeat text on the left and lists on the right: text joined by " · " below 48rem, pills from 48rem.
- A row with neither has no meta line.
- Overdue due text keeps its relative text, such as "Yesterday 10:00", and uses `--color-danger`; the Overdue chip, note count, and people icon are gone.
- The More button stays, as the goals require until T0265.
- The minute tick still redraws only the meta line through `dueKey` and `updateMeta`.

Reviewer reruns on HEAD 6e7baf1, all exit code 0:
- `npx vitest run`: 65 files, 1736 tests passed.
- `npx eslint .`: no output.
- `node scripts/check-sw-version.mjs`: "OK: 131 precached files match VERSION 2026-11-17.29."
- `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/gallery-app.spec.js tests/e2e/long-list.spec.js --reporter=line`: 62 passed.
  - These include 4.5:1 contrast checks for overdue text and badges in both themes, and the variable-height long-list checks.

The 360 px light and 1440 px dark after-captures show the specified layout: orange overdue text, the repeat icon, the 4/3 and 2/3 badges, and list pills at wide widths.
The full-suite failure in validation-proof.md is in behaviors-dialog.spec.js. It comes from T0258's `aria-live` editor count, not from this change, and T0280 tracks it.

## Defects
None.

## Process Gaps
- Non-blocking: the gallery's Chip section still describes and shows the removed row chips.
  - At `src/demo/visual-style-gallery.html:468`, the text says overdue chips "add the signal color and an icon".
  - Line 471 still shows a `.chip--overdue` "Overdue" specimen, and line 474 a "3 notes" chip.
  - The app's signal-color override of `.chip--overdue` is gone, so the specimen now renders in the vendor danger tone.
  - The style guide's Chip entry was updated to "task rows use the meta line instead"; the gallery section was not.
- Non-blocking: the JSDoc of `updateMeta` in `src/js/views/task-list.js:454` still reads "Show the chips of a row anew, such as a due chip".

## Required Rework
None.
