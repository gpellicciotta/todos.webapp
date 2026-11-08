## Technical Specifications

### Declared Files
- docs/specs/ui-design.md
- docs/requirements.md
- docs/specs/visual-style-guide.md
- scripts/draw-wireframes.py
- CHANGELOG.md

Size estimate: 5 files, 250 lines
Completion check: `python scripts/draw-wireframes.py docs/img/ui`, `python -m pytest tests`, and `ruff check scripts tests`.

### Starting Point
- Wide layout: the sidebar holds All tasks, the Lists header with a (+) button, and every list with its open task count.
- Compact layout has no sidebar; the bottom bar holds Tasks and Lists, so the Lists screen is the only list index there.
- The user button opens the user menu with Recycle bin and Settings, so a long list can no longer push them out of sight.
- The Lists screen shows one row per list with name, description start, counts, and sharing state (`LST-5`).
- T0046 adds a manual order for lists, in the front end only; this design must keep it usable at 100 or more lists.
- Names hold 1 to 100 characters, so rows must truncate or wrap predictably.
- Task views already render only visible rows (`TEC-16`); lists have no such mechanism yet.
- After sync, an account can hold shared lists too, and the Shared filter arrives with T0028.

### Questions to Decide
1. Sidebar scrolling: which parts stay fixed, which scroll, and how the current list stays in view.
2. Finding a list: a filter field, type-ahead jump, a keyboard shortcut, or a combination; where it sits.
3. Ordering: manual order only, or also name, recent activity, and open count; whether manual order stays when filtering.
4. Structure: pinned or favorite lists, collapsible groups such as Pinned, Shared, and Others, or one flat list.
5. Lists screen: which of those controls it shares with the sidebar, plus a count header and density.
6. Compact layout: how a thumb reaches the filter and a far-down list, and what the add button does while filtering.
7. Reordering at scale: drag with auto-scroll, move to top or bottom actions, and keyboard moves.
8. Rendering: windowing or `content-visibility: auto` for sidebar and screen; the budget at 150 and 500 lists.
9. Counts: how open counts for 500 lists stay cheap on every task change.
10. Accessibility: landmarks, roving focus, live announcements for filter results (`TEC-15`).

### Output
- Each answer as a `**[Decided]**` bullet in ui-design.md, with the reason in one sentence.
- Wireframes for the sidebar and the Lists screen at 100 or more lists, wide and compact.
- New requirement identifiers in requirements.md, such as `LST-8` onward, for finding and ordering many lists.
- Follow-up tasks, each within the sizing gates, and one render-time check with 150 lists in the performance spec.
