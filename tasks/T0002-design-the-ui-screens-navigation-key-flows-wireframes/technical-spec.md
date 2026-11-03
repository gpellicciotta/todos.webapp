## Technical Specifications

### Flows to Cover
Confirm this list against docs/requirements.md; requirements win on any difference.
- First launch without an account or server, straight into a usable empty state.
- Creating lists and tasks, adding a task to several lists, and reordering tasks within a list, all offline.
- Connecting to a todos server, signing in through Auth, and uploading local-only data.
- Showing sync state: offline, pending changes, syncing, synced, and failed.
- Resolving a conflict between a queued local edit and a newer server version.
- Losing access to a shared list while offline edits to it are queued.
- Signing out, and what happens to the local data.

### Screen Inventory Seed
- All-tasks view with list, status, and due filters.
- List view with hand ordering.
- Task editor with multi-list membership, due time, and overdue handling.
- Lists overview.
- Sharing dialog with roles.
- Recycle bin.
- Settings: theme, server connection, and account.

### Constraints
- Follow the UI guidelines: mobile-first from 360 px to 1440 px, 44 px touch targets, and WCAG 2.2 AA.
- Support light and dark themes through `prefers-color-scheme` with a `data-theme` override.
- Honor `prefers-reduced-motion`.
- The [family-portal visual style guide](https://github.com/gpellicciotta/family-portal/blob/main/docs/specs/visual-style-guide.md) is the design system to evaluate for reuse.
- The alternative is a new design system for this app; the user decided on 2026-11-03 to choose between these two.
- The todos [spa-spec.md](https://github.com/gpellicciotta/todos/blob/main/docs/specs/spa-spec.md) and `docs/tour` screenshots are prior art, not constraints.

### Decisions
Answered by the user on 2026-11-03:
- A new design system for this app; the family-portal system is not reused.
- Palette: monochrome with one signal color, such as electric violet.
- Typography: Inter, self-hosted as one variable font.
- Density: compact one-line task rows of about 48 px.

Decided by the agent on 2026-11-03, open to change in review:
- Danger and errors reuse the signal color with an icon; no second hue.
- Hash routes, since GitHub Pages has no route rewrites.
- All tasks defaults to the open status filter, like the list view.
- Wireframes move to task T0005 to keep this task below the large line.

### Out of Scope
- `style.css` and `visual-style-gallery.html` arrive with the first code task, once the technology stack is chosen.
