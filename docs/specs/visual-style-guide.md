# Visual Style Guide
The ToDo's design system: principles, decisions, and usage rules for every screen of the web app.
The [ui-design.md](ui-design.md) spec defines screens and behavior; this guide defines their look.

---

## Status of the System
The tokens, the font, the controls, the app components, and their gallery sections exist.
- [style.css](../../src/css/style.css): the only stylesheet a page links, with page-wide base styles.
- [tokens.css](../../src/css/tokens.css): primitive and semantic tokens and both themes.
- [fonts.css](../../src/css/fonts.css): the self-hosted Inter font face.
- [controls.css](../../src/css/controls.css): buttons, fields, chips, menus, popovers, dialogs, banners, and toasts.
- [app-components.css](../../src/css/app-components.css): the task list, task row, status button, and status menu.
- [app-chrome.css](../../src/css/app-chrome.css): navigation, sync indicator, user menu, inbox bell and panel, floating button, editor panel, note thread, and empty state.
- [icons.svg](../../src/img/icons.svg): the icon sprite, one `<symbol>` per icon on a 24 px grid.
- [visual-style-gallery.html](../../src/demo/visual-style-gallery.html): every token, control, app component, and pattern.

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
- **[Decided]** The palette is monochrome with one signal color: navy.
  Rejected: cool neutrals with a bright blue, and warm paper with ink.
  Rejected signal colors after a gallery comparison: violet, bright blue, deep yellow, and red.
- **[Decided]** Errors and dangers use deep orange on borders, error text, alert icons, and Delete controls.
  Replaces the earlier decision that errors use the signal color. Every error still keeps its alert icon and text.
  Rejected: red, which could not pair with a red signal and reads as harsher in a calm tool.
- **[Decided]** Status icons add color to their shapes: blue for In progress, green for Completed, the danger color for Cancelled.
  To do keeps the muted text color. Shapes and text still carry the status, so color never does alone.
  The in-progress sky blue stays clearly apart from the navy signal color; a unit test checks the distance.
- **[Decided]** Inter, self-hosted as one variable font, sets all text.
  Rejected: the system font stack, which renders differently on every platform.
- **[Decided]** The service worker caches the font, so offline pages look the same as online ones.
- **[Decided]** Task rows are compact: one 48 px line per task, with details in the task editor.
  Rejected: comfortable cards, and a user density setting that would double the states to test.
- **[Decided]** Themes use `light-dark()` on semantic tokens, so each color is defined once for both themes.
  Browsers without `light-dark()` get the light theme from an `@supports` fallback block.
- **[Decided]** The signal is navy 600 (`#1e40af`) on light grounds and navy 400 (`#8fa8f0`) on dark ones.
  Navy reaches at least 4.5:1 on every ground in both themes; the danger orange does too.
- **[Decided]** Inter 4.1 ships as one `InterVariable.woff2` file, without the italic file.
  The app sets no italic text, and the italic file would add 388 KB.
- **[Decided]** Reusable icons live in one sprite file, drawn with `<use href="…/img/icons.svg#id">`.
  Rejected: inline paths in every page, which repeat each icon and drift apart.
  Chromium resolves external `<use>` references over HTTP, so the gallery and its tests use the sprite.
- **[Decided]** Task rows respond to the width of their list, through a size container query.
  Rejected: a viewport media query, which cannot see a narrow main column beside the editor panel.
- **[Decided]** The account, Recycle bin, and Settings sit behind a circular user button, not in the navigation bars.
  Rejected: keeping them in the sidebar and bottom bar, where many lists push them out of sight.
  Rejected: a text account label, which costs width on 390 px phones; the button shows a name through its title and the panel.
- **[Decided]** New list is a floating plus button in the Lists view, not a top-bar menu entry.
  Rejected: a pill with a label, which read as an oval and was neither a normal button nor a circle.
  Rejected: a More menu in the top bar that held only New list, which hid the one action of the screen.
- **[Decided]** The app shell positions the sidebar, the bottom bar, the floating button, and the editor panel.
  The component styles hold no fixed or sticky positions, so the gallery shows them in place.
- **[Decided]** Component styles never scale a token by a bare number, such as `* 2` or `/ 2`.
  They use a named token, or add tokens together; [tokens.test.js](../../tests/unit/tokens.test.js) checks app-chrome.css.
- **[Decided]** Marks on an inline edge use logical properties, so they follow right-to-left text.

---

## Tokens
Token names follow the two-tier rule: primitives hold raw values, and components use semantic tokens only.

### Color
Definitions live in [tokens.css](../../src/css/tokens.css); the gallery's Color section shows them live.
- Gray ramp: `--gray-0` to `--gray-950`, thirteen slightly cool steps from white to near-black.
- Navy ramp: `--navy-50` to `--navy-950`, eight steps, the one signal hue.
- Deep orange: `--orange-700` and `--orange-400`, the danger hue for light and dark grounds.
- Grounds: `--color-bg` for the page, `--color-surface` for panels and dialogs, `--color-surface-sunken` for wells and chips.
- Hover and selection: `--color-hover-bg` for hovered rows, `--color-selected-bg` for the current row, route, and pressed toggles.
- Pressed: `--color-active-bg` for gray controls while pressed; only text and link colors sit on it.
- Text: `--color-text`, `--color-text-muted` for secondary lines and done tasks, `--color-text-disabled` for disabled controls only.
- Borders: `--color-border` for dividers, `--color-border-strong` for controls that need 3:1 contrast.
- Signal: `--color-signal` for the main action and overdue chips, `--color-on-signal` for text on it.
- Danger: `--color-danger` for error borders, error text, alert icons, Delete outlines and menu items, filled Delete buttons, and the focus ring of those controls.
- Danger states: `--color-danger-hover` and `--color-danger-active` for the filled Delete button, `--color-on-danger` for its text.
- Status: `--color-status-in-progress` (sky blue), `--color-status-completed` (green), and `--color-status-cancelled` (the danger color) for status icons; each reaches 3:1 on every ground.
- Signal states: `--color-signal-hover` and `--color-signal-active` for the hovered and pressed main action.
- Links: `--color-link` for links and quiet buttons.
- Focus: `--focus-ring` on every interactive element, drawn in `--color-focus` with a gap to the element.
- Shadow and scrim: `--color-shadow` tints both elevation levels, `--color-backdrop` dims the page behind modal dialogs.

Signal values and their lowest contrast ratios, checked by [tokens.test.js](../../tests/unit/tokens.test.js):

| Token                   | Light               | Dark                | Lowest ratio, light / dark   |
| :---------------------- | :------------------ | :------------------ | :--------------------------- |
| `--color-signal`        | navy 600, #1e40af   | navy 400, #8fa8f0   | 7.54 / 5.79 on grounds       |
| `--color-signal-hover`  | navy 700, #1e3a8a   | navy 300, #b3c4f6   | 10.36 / 10.82 with on-signal |
| `--color-signal-active` | navy 800, #172e6e   | navy 200, #c7d4f0   | 12.71 / 13.33 with on-signal |
| `--color-on-signal`     | gray 0, #ffffff     | gray 950, #111216   | 8.72 / 8.05 on signal        |
| `--color-link`          | navy 700, #1e3a8a   | navy 300, #b3c4f6   | 8.95 / 7.78 on grounds       |
| `--color-focus`         | navy 600, #1e40af   | navy 400, #8fa8f0   | 7.54 / 5.79 on grounds       |
| `--color-danger`        | orange 700, #b23b0b | orange 400, #fb923c | 5.15 / 5.95 on grounds       |

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
- `--radius-round`: circles, such as the unseen entries dot of the sync indicator.
- `--border-width` for every border; `--focus-ring-width` and `--focus-ring-offset` size the focus ring.
- `--focus-ring-offset-inset`: draws the ring inside items that fill a bar, such as bottom bar items.
- `--border-width-strong`: the leading edge of error banners.
- `--target-min`: 44 px, the minimum size of every control.
- `--icon-size` and `--icon-stroke`: every icon is 20 px with one stroke width.
- `--icon-size-lg` and `--icon-stroke-thin`: the larger, thinner icon of empty states.
- `--row-height`: 48 px, the minimum task row height.
- Layout: `--width-main` caps the main column, `--width-sidebar` and `--width-editor` size the side panels.
- Control minimums: `--width-menu` for menus and popovers, `--width-segment-min` for segmented options.
- `--width-chip-max`: the widest list chip in a task row; longer list names truncate.
- Text minimums: `--width-text-min` before a banner's action wraps, `--height-textarea-min` for textareas.

### Elevation, Layers, and Motion
- `--elevation-1` for popovers and menus, `--elevation-2` for dialogs and the wide editor panel.
- `--layer-*` for stacking: sticky bars, popovers, dialogs, and toasts; never raw `z-index` values.
- `--duration-fast` and `--duration-base` with `--ease-standard`; durations drop to zero under reduced motion.
- `--duration-spin`: one turn of the syncing icon; reduced motion stops the spin entirely.

---

## Components
Each component gets a gallery section with every state: default, hover, focus-visible, active, disabled, and error.
Gallery specimens force hover, active, and focus with `.is-hover`, `.is-active`, and `.is-focus`; app markup never uses them.

### Controls
Defined in [controls.css](../../src/css/controls.css); behavior modules in [src/js/ui](../../src/js/ui/) add keyboard and focus handling.

- [Button](../../src/demo/visual-style-gallery.html#button): `.button` in the signal color for the one main action of a view.
  Delete buttons that confirm or start a delete, such as Delete task and Delete list in the editors and the buttons in dialogs and in-place questions, use `.button--danger`, filled with `--color-on-danger` text.
  Delete buttons beside other actions in a row, such as the recycle bin's Delete permanently, use `.button--secondary.button--danger`, a danger outline with neutral text.
  Delete menu items use `.menu__item--danger`, with danger text and icon; its pressed ground is the hover ground to keep 4.5:1.
  Use `--secondary` in gray for other actions and `--quiet` for low-emphasis ones, such as Reset and Undo.
  Never place two signal buttons side by side.
- [Icon button](../../src/demo/visual-style-gallery.html#icon-button): a square `--target-min` button with one icon and an `aria-label` naming the action and its object.
  Toggles set `aria-pressed`; the pressed state adds the signal outline and keeps hover and active grounds.
- [Field](../../src/demo/visual-style-gallery.html#field): label, control, optional hint, character counter, and error message.
  Use it for text, search, date, and time inputs, textareas, and selects.
  Invalid controls set `aria-invalid="true"` and `aria-describedby`; the error line adds an alert icon and text.
- [Checkbox and radio](../../src/demo/visual-style-gallery.html#checkbox-radio): native inputs in the signal accent, inside a label row of `--target-min`.
  Group them in a `fieldset` with a `legend`.
- [Chip](../../src/demo/visual-style-gallery.html#chip): a small sunken label for due times, lists, and note counts; the overdue chip uses the signal color and an icon.
  Chips are not buttons; a removable chip holds a separate remove icon button.
- [Filter chip](../../src/demo/visual-style-gallery.html#filter-chip): a chip that opens a popover and shows its active value.
  It carries `aria-expanded`, never `aria-pressed`; `data-active="true"` adds the signal outline of a set filter.
  The task views no longer use it: the view options rows replace the chips.
- [Segmented control](../../src/demo/visual-style-gallery.html#segmented-control): radio buttons in one row, for status in the editor and the grouping choice in the view options.
  The checked option adds a signal outline and semibold text, so it never relies on color alone.
- [Menu](../../src/demo/visual-style-gallery.html#menu) and [popover](../../src/demo/visual-style-gallery.html#popover): anchored panels at `--elevation-1` that close on Escape and outside clicks.
  Choice menus use `menuitemradio` items with a check icon on the current one.
  `attachMenu(trigger, menu, { onSelect })` in [menu.js](../../src/js/ui/menu.js) makes a menu button.
  Enter, Space, or ArrowDown open it at the first item; arrows wrap and skip `aria-disabled` items.
  `attachPopover(trigger, panel)` in [popover.js](../../src/js/ui/popover.js) anchors a non-modal panel.
  Both return a controller with `open`, `close`, and `destroy`, and return focus to the trigger on close.
- [Dialog](../../src/demo/visual-style-gallery.html#dialog): a native `<dialog>` with a title, a body, and actions at the end.
  Below 64rem it is a full-width sheet, and full height when opened as a modal.
  `openDialog(dialog, { onClose })` in [dialog.js](../../src/js/ui/dialog.js) opens it as a modal.
  `.dialog--in-view` makes it fill its container, for the compact import: no scrim, radius, or shadow, and a ruled header.
  The shell places it in the main column; `openDialog(dialog, { modal: false })` opens it in place, without the Tab trap.
  Tab stays inside, Escape closes with `cancel`, and focus returns to the opener.
  `[data-dialog-close]` buttons close it with their value; `confirmDialog` resolves to a boolean.
- [Banner](../../src/demo/visual-style-gallery.html#banner): a full-width notice above the content with an icon, one or two sentences, and an optional action.
  Errors use `--error`, `role="alert"`, the danger outline, and an alert icon.
- [Toast](../../src/demo/visual-style-gallery.html#toast): a short message at the bottom with an optional Undo, announced through a live region.
  Never use a toast as the only place an error appears.
  `createToaster().show(message, { onAction })` in [toast.js](../../src/js/ui/toast.js) adds an Undo button.
  Toasts expire after 8 seconds, pause while hovered or focused, and stack at most three.
  While a modal dialog is open the page is inert, so toasts wait until it closes.
  With `undoShortcut: true`, Ctrl+Z or Cmd+Z outside text fields runs the newest Undo; `undoLatest()` does the same.
  [live-region.js](../../src/js/ui/live-region.js) announces them; `announce(message, { politeness: 'assertive' })` suits blocking errors.
  Its regions use the `.visually-hidden` class of style.css.

### App Components
Defined in [app-components.css](../../src/css/app-components.css) and [app-chrome.css](../../src/css/app-chrome.css), on top of the controls.
App states use attributes the app sets, such as `data-status` and `aria-current`, never gallery classes.

- [Status button](../../src/demo/visual-style-gallery.html#status-button): an `.icon-button.status-button` opening the status menu.
  The icon shapes differ, so status never relies on color. The app sets `data-status` on the button, which colors the icon:
  - `todo`: an empty circle, in the muted text color.
  - `in-progress`: a circle with a filled bottom half, in blue.
  - `completed`: a filled circle with a check, in green, with struck-through muted text.
  - `cancelled`: a filled circle with a dash, in the danger color, with struck-through muted text.

  The status menu is a `.menu.status-menu` of `menuitemradio` items, each with its status icon in the same color (`data-status` on the item).
  Read-only rows disable the button but keep its icon at full icon contrast.
- [Task row](../../src/demo/visual-style-gallery.html#task-row): a `.task-row` in a `.task-list`, one line at `--row-height`.
  It holds the drag handle, the status button, the open link, and the More button.
  The open link holds the description, due chip, two list chips, a "+n" chip, notes, and the shared marker.
  The description truncates with an ellipsis; list chips truncate at `--width-chip-max`.
  Below 36rem of list width, rows show only the status, the description, and the due chip.
  States use attributes the app sets:
  - Status: `data-status` mutes and strikes through completed and cancelled text.
  - Selected: `aria-current="page"` on the open link adds the selected ground and a signal edge on the inline start.
    A selected row keeps hover and press feedback.
  - Dragging: `data-dragging="true"` lifts the row to `--elevation-2`.
  - Drop target: `data-drop="before"` or `"after"` draws a signal line on that row edge.
  - Read-only: `data-readonly="true"`, a disabled status button that stays flat on hover, and no handle or More button.
  - Focus: the row draws the ring for its open link, inside its own edge.

  Show the drag handle only in manual order; devices without hover hide it anyway.
- [Navigation](../../src/demo/visual-style-gallery.html#navigation): the wide `.sidebar` and the compact `.bottom-nav`.
  Both mark the current route with `aria-current="page"`: a signal edge, a signal icon, and semibold text.
  The sidebar edge sits on the inline start; the current item keeps hover and active grounds.
  The app's sidebar holds All tasks, Lists, and each list with its open count.
  Create lists through the floating plus in the Lists view; the sidebar has no creation action.
  Recycle bin, Settings, and the account sit in the user menu, so the app leaves `.sidebar__end` and `.sidebar__footer` empty;
  the gallery still shows both, as the optional end group and footer of the component.
  The app's bottom bar holds Tasks and Lists, each an icon above a label; the gallery shows four items to cover the states.
- [User menu](../../src/demo/visual-style-gallery.html#user-menu): the `.user-button` that ends the top bar, and its `.user-panel`.
  The button is a 44 px circle: a person icon in local mode, the initials in the signal color once `data-state="connected"`,
  and the quiet look again for `sign-in-needed`. Its title and aria-label name the user.
  The panel is a `.popover` with the name, the state, and two `.button--secondary` links with icons.
  The current route's link takes the signal border and icon on the selected ground.
  A `.button.button--secondary.user-menu__sign-in` joins the button only while the session needs a new sign-in.
  Use it for the account and the destinations needed now and then; keep daily destinations in the navigation bars.
  The shell anchors the panel to the button, end edges aligned, so the component styles hold no fixed position.
- [Floating button](../../src/demo/visual-style-gallery.html#floating-button): a `.fab` signal circle with one icon and no label, at `--elevation-2`.
  Its aria-label and title name the action, such as New list.
  Use it for the one main action of a screen that lists things, such as New list; never for secondary actions.
  It sits on the `--layer-float` layer, above rows and bars, below popovers, dialogs, and toasts.
  The component styles hold no position; the app shell fixes it at the bottom end of the screen, above the bottom bar when compact.
  Screens give their content room to scroll clear of it, and hide it while an editor covers the same corner.
- [Sync indicator](../../src/demo/visual-style-gallery.html#sync-indicator): a `.sync-indicator` button with one icon and label per `data-state`.
  States: `local`, `synced`, `syncing`, `offline` with its pending count, `sign-in`, and `error`.
  Sign-in uses the signal color and error uses the danger color; the syncing icon spins, except under reduced motion.
  The `.sync-indicator__dot` marks unseen sync log entries, with visually hidden text naming it.
  Its ring takes the ground under it: `--sync-indicator-ground`, the page ground by default.
  The sidebar and the top bar set it to the surface; hover and active use the indicator's own ground.
- [Editor panel](../../src/demo/visual-style-gallery.html#editor-panel): an `<aside class="editor-panel">` with a title and a close button.
  From 64rem it is a bordered right panel at `--elevation-2`; below, it fills the screen.
  Its body scrolls; sections stack with dividers, and the danger zone sits apart at the end.
- [Note thread](../../src/demo/visual-style-gallery.html#note-thread): the add note field above an `<ol>` of notes, newest first.
  Each `.note` shows its author, its time, an "edited" mark, its text, and a More button for own notes.
- [Empty state](../../src/demo/visual-style-gallery.html#empty-state): a short sentence, an optional icon, and at most two actions.
  Use it for a first launch, a filter without results, and an empty recycle bin.

---

## Patterns
- [Task list](../../src/demo/visual-style-gallery.html#task-list): a `.task-view` with the view header and its More button, the search field, an `.add-block`, and rows.
  The add block holds the add bar and the info line; it sits above the rows in wide layouts and below them in compact ones.
- Manual ordering: drag handles on pointer devices, plus Move up and Move down in the row menu.
- Search and add: one field with an Add button, and under it a 12 px muted info line of the task count and active options.
  Leave at least 32 px between this block and the rows; the options themselves live in the view options panel.
  The `.info-line` wraps to two lines, then truncates; its quiet Reset button shows only while an option differs from its default.
- View options: the editor panel with Reset at the top, a `.view-options__row` accordion of filters, and Sort by.
  Each row shows its value at the end, and opening one row closes the other.
  Sort by is a native select with a segmented Ascending and Descending toggle; the compact screen ends with a sticky Show N tasks button.
- [Task editor](../../src/demo/visual-style-gallery.html#task-editor): the editor panel beside the rows, with the selected row marked.
  Compact layouts show the panel alone, as a full screen.
- [In-place confirmation](../../src/demo/visual-style-gallery.html#note-thread): an `.inline-confirm` question with Delete and Keep.
  A destructive row action swaps its buttons for it, as the last note of the note thread shows.

---

## Icons
- Use stroke SVG icons with an `icon` class, so icons follow the text color.
- Draw sprite icons with `<svg class="icon" aria-hidden="true"><use href="…/img/icons.svg#id"/></svg>`.
- Pages at the web root use `img/icons.svg`; the gallery uses `../img/icons.svg`.
- Add a reusable icon to [icons.svg](../../src/img/icons.svg) as a `<symbol>` with a `0 0 24 24` view box.
- Symbols hold no colors: filled parts set `fill="currentColor"` and `stroke="none"`.
- Mark decorative icons with `aria-hidden="true"`; buttons carry the accessible name, not the icon.
- Keep one stroke width and one 24 px grid across the set.
- Status icons: `status-todo`, `status-in-progress`, `status-completed`, and `status-cancelled`.
- Sync icons: `sync-local`, `sync-synced`, `sync-syncing`, `sync-offline`, `sync-sign-in`, and `sync-error`.

---

## Accessibility Rules
- Keep every text and background token pair at WCAG 2.2 AA contrast in both themes (`TEC-15`).
- Keep the signal color at 3:1 against its ground when it marks a non-text state.
- Keep icon colors at 3:1 on every ground a control shows, including hover and pressed grounds.
- Keep touch targets at least `--target-min` in both dimensions.
- Use real `<button>`, `<a href>`, `<label>`, `<input>`, and `<dialog>` elements; never clickable `<div>` elements.
- Follow `prefers-color-scheme` by default, and allow `data-theme="light"` or `data-theme="dark"` on `<html>`.
- Support layouts from 360 px phones to 1440 px desktops without horizontal scrolling.
