# Visual Style Guide
The ToDo's design system: principles, decisions, and usage rules for every screen of the web app.
The [ui-design.md](ui-design.md) spec defines screens and behavior; this guide defines their look.

---

## Status of the System
The tokens, the font, and the gallery's token sections exist; components follow in later tasks.
- [style.css](../../src/css/style.css): the only stylesheet a page links, with page-wide base styles.
- [tokens.css](../../src/css/tokens.css): primitive and semantic tokens and both themes.
- [fonts.css](../../src/css/fonts.css): the self-hosted Inter font face.
- [visual-style-gallery.html](../../src/demo/visual-style-gallery.html): every token group, with a theme switch.
- `src/css/components.css`: base components and patterns, added with the first component task.

Serve the gallery with `npm run serve`, then open `/demo/visual-style-gallery.html`.
Change the stylesheets first, then the gallery and this guide in the same commit.

---

## Principles
- Monochrome: grays carry the interface, so the task text stands out.
- One signal: a single vivid color marks the main action, focus, selection, and urgency.
- Compact: one line per task, tight but never cramped, with 44 px touch targets.
- Shape over color: status, sync state, and errors differ by icon shape and text, never by color alone.
- Calm motion: short transitions that clarify change, and none under reduced motion.

---

## Decisions
- **[Decided]** The app gets its own design system instead of reusing the family-portal one.
  Rejected: the family-portal system, whose warm, personal look suits a family space more than a dense task tool.
- **[Decided]** The palette is monochrome with one signal color: electric violet.
  Rejected: cool neutrals with blue, and warm paper with ink.
- **[Decided]** Danger and errors use no second hue: they use the signal color with an alert icon and text.
  Deletions are recoverable through the recycle bin, so destructive actions need no red warning color.
- **[Decided]** Status uses icon shapes and text weight, not colors: see the status icon rules below.
- **[Decided]** Inter, self-hosted as one variable font, sets all text.
  Rejected: the system font stack, which renders differently on every platform.
- **[Decided]** The service worker caches the font, so offline pages look the same as online ones.
- **[Decided]** Task rows are compact: one 48 px line per task, with details in the task editor.
  Rejected: comfortable cards, and a user density setting that would double the states to test.
- **[Decided]** Themes use `light-dark()` on semantic tokens, so each color is defined once for both themes.
  Browsers without `light-dark()` get the light theme from an `@supports` fallback block.
- **[Decided]** The signal is violet 600 (`#7c3aed`) on light grounds and violet 400 (`#a78bfa`) on dark ones.
  Rejected: violet 500 (`#8b5cf6`) in dark, as white text on it reaches only 4.23:1.
- **[Decided]** Inter 4.1 ships as one `InterVariable.woff2` file, without the italic file.
  The app sets no italic text, and the italic file would add 388 KB.

---

## Tokens
Token names follow the two-tier rule: primitives hold raw values, and components use semantic tokens only.

### Color
Definitions live in [tokens.css](../../src/css/tokens.css); the gallery's Color section shows them live.
- Gray ramp: `--gray-0` to `--gray-950`, thirteen slightly cool steps from white to near-black.
- Violet ramp: `--violet-50` to `--violet-950`, the one signal hue.
- Grounds: `--color-bg` for the page, `--color-surface` for panels and dialogs, `--color-surface-sunken` for wells and chips.
- Hover and selection: `--color-hover-bg` for hovered rows, `--color-selected-bg` for the current row, route, and pressed toggles.
- Text: `--color-text`, `--color-text-muted` for secondary lines and done tasks, `--color-text-disabled` for disabled controls only.
- Borders: `--color-border` for dividers, `--color-border-strong` for controls that need 3:1 contrast.
- Signal: `--color-signal` for the main action and overdue chips, `--color-on-signal` for text on it.
- Signal states: `--color-signal-hover` for the hovered main action, `--color-link` for links.
- Focus: `--focus-ring` on every interactive element, drawn in `--color-focus` with a gap to the element.
- Shadow: `--color-shadow` tints both elevation levels.

Signal values and their lowest contrast ratios, checked by [tokens.test.js](../../tests/unit/tokens.test.js):

| Token                  | Light               | Dark                | Lowest ratio, light / dark |
| :--------------------- | :------------------ | :------------------ | :------------------------- |
| `--color-signal`       | violet 600, #7c3aed | violet 400, #a78bfa | 4.92 / 4.95 on grounds     |
| `--color-signal-hover` | violet 700, #6d28d9 | violet 300, #c0a9fa | 7.10 / 9.18 with on-signal |
| `--color-on-signal`    | gray 0, #ffffff     | gray 950, #111216   | 5.70 / 6.88 on signal      |
| `--color-link`         | violet 700, #6d28d9 | violet 300, #c0a9fa | 6.14 / 6.60 on grounds     |
| `--color-focus`        | violet 600, #7c3aed | violet 400, #a78bfa | 4.92 / 4.95 on grounds     |

### Typography
- `--font-body`: Inter for all text, with tabular figures for times and counts.
- Text scale: `--text-xs` to `--text-xl`; task rows use `--text-base`, chips use `--text-sm`.
- Weights: regular for body, medium for task descriptions and labels, semibold for headings.
- Weight tokens: `--weight-regular`, `--weight-medium`, and `--weight-semibold`.
- Line heights: `--leading-tight` for headings and single lines, `--leading-normal` for body text.
- `--font-mono`: the system monospace stack, for code and identifiers in the gallery.
- Open tasks use medium weight; done tasks use regular weight and the muted color.
- Cancelled tasks also get a strike-through, so they differ from completed ones beyond the icon.

### Space, Shape, and Size
- `--space-1` to `--space-8`: a 4 px based scale; rows use `--space-2` inside and no gap between.
- `--radius-sm` for chips, `--radius-md` for controls and rows, `--radius-lg` for dialogs and panels.
- `--border-width` for every border; `--focus-ring-width` and `--focus-ring-offset` size the focus ring.
- `--target-min`: 44 px, the minimum size of every control.
- `--row-height`: 48 px, the task row height.
- Layout: `--width-main` caps the main column, `--width-sidebar` and `--width-editor` size the side panels.

### Elevation, Layers, and Motion
- `--elevation-1` for popovers and menus, `--elevation-2` for dialogs and the wide editor panel.
- `--layer-*` for stacking: sticky bars, popovers, dialogs, and toasts; never raw `z-index` values.
- `--duration-fast` and `--duration-base` with `--ease-standard`; durations drop to zero under reduced motion.

---

## Components
Each component gets a gallery section with every state: default, hover, focus-visible, active, disabled, and error.

- Button: `.button` in the signal color for the one main action of a view, `--secondary` in gray for others.
  Never place two signal buttons side by side.
- Icon button: a square `--target-min` button with one icon and an `aria-label` naming the action and its object.
- Status button: the status icon of the task row, opening a status menu; the icon shapes are:
  - `todo`: an empty circle.
  - `in-progress`: a half-filled circle.
  - `completed`: a filled circle with a check, with muted text.
  - `cancelled`: a circle with a dash, with struck-through muted text.
- Task row: status button, description, chips, and a More button at `--row-height`.
  States: default, hover, focus-visible, selected, dragging, drop target, done, and read-only.
- Chip: a small sunken label for due times, lists, and note counts; the overdue chip uses the signal color and an icon.
- Filter chip: a toggle chip with `aria-pressed` that opens a popover and shows its active value.
- Segmented control: radio buttons in one row, used for status in the editor and order buttons in the list view.
- Field: label, control, optional hint, character counter, and error message.
  Invalid controls set `aria-invalid="true"` and `aria-describedby`; the border change is never the only cue.
- Menu and popover: anchored panels at `--elevation-1` that close on Escape and outside clicks.
- Dialog: a native `<dialog>` with a title, a body, and actions at the end; a full-height sheet in compact layouts.
- Banner: a full-width notice above the content with an icon, one or two sentences, and an optional action.
- Toast: a short message at the bottom with an optional Undo, announced through a live region.
- Sync indicator: an icon and label per sync state, plus a dot for unseen sync log entries.
- Navigation: the compact bottom bar and the wide sidebar, both marking the current route with `aria-current`.
- Empty state: a short sentence, an optional icon, and at most two actions.

---

## Patterns
- Task list: task rows in a `<ul>`; the add bar sits above them in wide layouts and pinned below in compact ones.
- Manual ordering: drag handles on pointer devices, plus Move up and Move down in the row menu.
- View controls: search, filter chips, and the sort menu in one bar above the task list.
- Editor panel: the task or list editor; a right panel in wide layouts, a full screen in compact ones.
- Note thread: an add note field above an `<ol>` of notes, newest first.
  Each note shows its author, its time, an "edited" mark, and a More menu.
- In-place confirmation: a destructive row action swaps its buttons for a question with Delete and Keep.

---

## Icons
- Use inline stroke SVG icons with an `icon` class, so icons follow the text color.
- Mark decorative icons with `aria-hidden="true"`; buttons carry the accessible name, not the icon.
- Keep one stroke width and one 24 px grid across the set.

---

## Accessibility Rules
- Keep every text and background token pair at WCAG 2.2 AA contrast in both themes (`TEC-15`).
- Keep the signal color at 3:1 against its ground when it marks a non-text state.
- Keep touch targets at least `--target-min` in both dimensions.
- Use real `<button>`, `<a href>`, `<label>`, `<input>`, and `<dialog>` elements; never clickable `<div>` elements.
- Follow `prefers-color-scheme` by default, and allow `data-theme="light"` or `data-theme="dark"` on `<html>`.
- Support layouts from 360 px phones to 1440 px desktops without horizontal scrolling.
