---
task: T0234
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T10:24:38Z
reviewed_commit: "30e74ec"
base_commit: "1ad2dd8"
branch: task/T0234-show-event-actions-done-and-target-counts-and
session: antigravity-20261115-62b39c
session_agent: antigravity
session_created_at: 2026-11-15T10:12:58Z
---
# Review Findings: Task T0234 (Round 1)

## Summary
Core ticking, status menu actions, counts, and rule editing work well; unit, lint, service-worker, and 99 e2e tests pass.
Rejected for a wrong `uncomplete` button icon, a stale `x` shortcut description, stale design-system docs, and guideline violations.

## Defects
- In [task-editor.js](../../../src/js/views/task-editor.js), `fillStatus` switches `tick` to `uncomplete` when `completed` without updating `data-status` or its icon.
  `Undo completion` and `Untick, 3 of 3` therefore render the green `status-completed` icon instead of the resulting status icon.

- In [settings.js](../../../src/js/views/settings.js), `SHORTCUTS` for `x` still says "Complete the focused task, or set a finished one back to To do.".
  Pressing `x` now ticks (`complete`, `uncomplete`, or `reopen`), so Settings > About misstates the live shortcut behavior.

- In [requirements.md](../../../docs/requirements.md) lines 75–77, `TSK-4` claims a status menu exists in the editor and omits `reopen` on click.
  The editor renders status action buttons under the status line, and clicking a cancelled row button posts `reopen`.

- [visual-style-guide.md](../../../docs/specs/visual-style-guide.md) was not updated alongside [app-components.css](../../../src/css/app-components.css), [views.css](../../../src/css/views.css), and [visual-style-gallery.html](../../../src/demo/visual-style-gallery.html).
  Lines 186 and 218–234 still describe editor status radios, toggle clicks, `menuitemradio`, `todo`, and old compact chips.
  [ui-design.md](../../../docs/specs/ui-design.md) lines 222 and 229 also still name `todo` and omit the count chip from compact layouts.

- [visual-style-gallery.html](../../../src/demo/visual-style-gallery.html) lines 424, 1128, and 1507 still show `Last activity` in the Sort and Details specimens.
  [app-components.css](../../../src/css/app-components.css) lines 427 and 443–444 also retain stale toggle and `.menu__check` comments and selectors.

## Process Gaps
- Version-controlled prose exceeds the 20-word sentence cap in [CHANGELOG.md](../../../CHANGELOG.md) line 38 and [ui-design.md](../../../docs/specs/ui-design.md) lines 215, 624, and 626.
  Branch commit `30e74ec` also has a 21-word commit message.

- In [CHANGELOG.md](../../../CHANGELOG.md), `v0.4.1-pre` retains superseded T0225 status-button and menu bullets (lines 21–23) beside T0234 replacements (lines 36–37).
  Active `-pre` entries affecting the same scope must be consolidated into net version-to-version deliverables.

- [validation-proof.md](validation-proof.md) omits light and dark screenshots of [visual-style-gallery.html](../../../src/demo/visual-style-gallery.html) at 390 px and 1440 px widths.

## Required Rework
- Update `fillStatus` in [task-editor.js](../../../src/js/views/task-editor.js) so `uncomplete` sets `tick.dataset.status` and its `<use>` icon to the resulting status; add unit assertions.
- Update the `x` entry in `SHORTCUTS` in [settings.js](../../../src/js/views/settings.js) to describe ticking, and update or add unit coverage.
- Fix `TSK-4` in [requirements.md](../../../docs/requirements.md) and lines 222 and 229 in [ui-design.md](../../../docs/specs/ui-design.md) (`ready` and the compact count chip).
- Update [visual-style-guide.md](../../../docs/specs/visual-style-guide.md), `Last activity` specimens in [visual-style-gallery.html](../../../src/demo/visual-style-gallery.html), and stale comments/selectors in [app-components.css](../../../src/css/app-components.css), then update precache hashes.
- Trim sentences over 20 words in [CHANGELOG.md](../../../CHANGELOG.md) and [ui-design.md](../../../docs/specs/ui-design.md), consolidate superseded `v0.4.1-pre` bullets, and cap commit messages at 20 words.
- Capture gallery verification screenshots at 390 px and 1440 px in light and dark themes, and log a rework size note if counted files cross 18.
