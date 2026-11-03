# Visual Style Guide
The ToDo's design system: principles, decisions, and usage rules for every screen of the web app.
The [ui-design.md](ui-design.md) spec defines screens and behavior; this guide defines their look.

---

## Status of the System
This guide comes first; the stylesheets and the gallery follow with the first code task.
That task adds these files, once the web root is chosen:
- `{{web-root}}/css/style.css`: the only stylesheet a page links.
- `{{web-root}}/css/tokens.css`: primitive and semantic tokens and both themes.
- `{{web-root}}/css/components.css`: base styles, components, and patterns.
- `{{web-root}}/css/fonts.css`: the self-hosted Inter font faces.
- `{{web-root}}/demo/visual-style-gallery.html`: every token, component, state, and pattern in both themes.

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

---

## Tokens
Token names follow the two-tier rule: primitives hold raw values, and components use semantic tokens only.

### Color
- Gray ramp: about twelve steps from near-white to near-black, slightly cool.
- Signal ramp: violet steps for light and dark themes, each pair checked for AA contrast.
- Grounds: `--color-bg` for the page, `--color-surface` for panels and dialogs, `--color-surface-sunken` for wells and chips.
- Text: `--color-text`, `--color-text-muted` for secondary lines and done tasks, `--color-text-disabled` for disabled controls only.
- Borders: `--color-border` for dividers, `--color-border-strong` for controls that need 3:1 contrast.
- Signal: `--color-signal` for the main action and overdue chips, `--color-on-signal` for text on it.
- Selection: `--color-selected-bg` for the current row, the active route, and pressed toggles.
- Focus: `--focus-ring` on every interactive element, in the signal color with a gap to the element.

### Typography
- `--font-body`: Inter for all text, with tabular figures for times and counts.
- Text scale: `--text-xs` to `--text-xl`; task rows use `--text-base`, chips use `--text-sm`.
- Weights: regular for body, medium for task descriptions and labels, semibold for headings.
- Open tasks use medium weight; done tasks use regular weight, the muted color, and a strike-through.

### Space, Shape, and Size
- `--space-1` to `--space-8`: a 4 px based scale; rows use `--space-2` inside and no gap between.
- `--radius-sm` for chips, `--radius-md` for controls and rows, `--radius-lg` for dialogs and panels.
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
- Status button: the four status icons of the task row; the icon shapes are:
  - `todo`: an empty circle.
  - `in-progress`: a half-filled circle.
  - `completed`: a filled circle with a check.
  - `cancelled`: a circle with a slash.
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
- Task list: task rows in a `<ul>`, with the add bar below; done tasks stay in place until a filter hides them.
- Manual ordering: drag handles on pointer devices, plus Move up and Move down in the row menu.
- View controls: search, filter chips, and the sort menu in one bar above the task list.
- Editor panel: a right panel in wide layouts and a full screen in compact layouts.
- Note thread: notes in a `<ol>`, each with author, time, an "edited" mark, and a More menu.
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
