## Technical Specifications

The reference is the Help screen of the Counters app: `counters.server/webapp/js/view/help-view.mjs` and
`counters.server/docs/img/help-view.png` in the sibling repository.
It shows a search field, topic chips, and one card per panel, with FAQ entries that expand.
- **[Decided]** Build the screen with the vendored `createHelpPage` of `src/vendor/design/js/help-page.js`.
  It is the support.webapp version of the same pattern: search, topic chips, section cards, FAQ collapsibles,
  Expand All, a no-results state, `?q=` and `?topic=` links, and release notes.
  Rejected: porting the Counters view, which hard-codes HTML and Font Awesome icons outside the design system.

### Route and Menu
- Add the route `{ name: 'help', path: 'help', view: 'help', editor: null }` to `src/js/ui/router.js`.
- Mount it with `mountHelp` from the new `src/js/views/help.js` in `src/js/app.js`, beside `settings`.
- The user menu lists the connection state, Recycle bin, Settings, then Help, each with its icon.
  Help uses a `help` symbol added to `src/img/icons.svg`, drawn like the vendored `icon-help`.
- Help keeps the centered `--width-main` column of Settings, with no view actions and no editor.
- The document title and top bar read "Help"; the route is marked current in the user menu like Settings.

### Panels
In this order, each a `createHelpPage` section with its topic:

| Panel                        | Topic key       | Source                                              |
| :--------------------------- | :-------------- | :-------------------------------------------------- |
| Application Info & Support   | `info`          | `src/js/version.js`, the session, and fixed strings |
| Welcome to ToDo's            | `welcome`       | `help/welcome.md`                                   |
| Getting Started Tutorial     | `tutorial`      | `help/getting-started.md`                           |
| FAQ                          | `faq`           | `help/faq.md`                                       |
| Release notes                | `release-notes` | `help/CHANGELOG.md`                                 |

- Topic chips: All topics, App info, Welcome, Tutorial, FAQ, and Release notes.
- The Markdown panels take their title from the doc's level-1 heading.
- Application Info & Support shows:
  - The version and build date, from `VERSION` and `BUILD_DATE`, as Settings About does today.
  - The storage mode: "Local only: your data stays on this device", or the connected account and server.
  - The link "Requirements and source code" to `https://github.com/gpellicciotta/todos.webapp`, moved from Settings.
  - A **Report a problem** link to `https://github.com/gpellicciotta/todos.webapp/issues`, opening in a new tab.
- Welcome and Tutorial render the intro, then each level-2 part as an `h3` with its body.
- FAQ renders each level-2 part as a `faq.items` entry: the heading is the question, the body is the answer.
- Release notes parse `help/CHANGELOG.md` with the vendored `parseChangelog` and pass the releases to `setReleases`.
  The `-pre` heading shows as in development; areas group the entries as `release-notes.js` does.

### Markdown Renderer
- Add `src/js/ui/markdown.js`, which renders the subset of the T0309 technical spec into DOM nodes.
- It exports `parseHelpDoc(text)`, returning `{title, intro: Node[], parts: [{heading, body: Node[]}]}` for a document.
- It creates nodes with `createElement` and `textContent` only, never `innerHTML`, so doc text never becomes markup.
- Links: `https:` opens in a new tab with `rel="noopener noreferrer"`; `#/` routes stay in the tab; others show as text.
- Unsupported syntax, such as raw HTML or a table, shows as plain text.

### Changelog Parser
- Vendor `src/changelog-parser.mjs` of the sibling `support.js` repository, commit `3747182` (v4.0.1-pre), unchanged.
- Place it at `src/vendor/support-js/changelog-parser.mjs`, with a provenance comment naming the version and commit.
- It has no imports and is MIT licensed by the same author; follow the `project-setup-guidelines` skill on vendoring.

### Loading and Failure
- On mount, fetch the four help files in parallel; the panels show the vendored loading state until each file arrives.
- A failed fetch shows "This help could not load. Check the connection and try again." with **Retry** in that panel only.
- After a first load, the T0310 cache serves the files offline.

### Settings
- Remove the Keyboard shortcuts and About sections, `SHORTCUTS`, `aboutSection`, `shortcutsSection`, and their strings.
- Keep Appearance, Adding tasks, Reminders, Data, and Connection, and update the module comment.
- The FAQ of T0309 now holds the shortcut list and the add field syntax.
- Update ui-design.md lines that point to the Settings Keyboard shortcuts section, such as the `l` shortcut note.

### Docs and Wireframes
- `docs/requirements.md`: add a Help section, with `HLP-1` to `HLP-4`: menu entry, panels, search and topics, offline.
- `docs/specs/ui-design.md`: add a Help section, update the user menu to four items, and drop the two Settings sections.
- `docs/specs/visual-style-guide.md`: name the vendored help page pattern for Help.
- `scripts/draw-wireframes.py`: add Help to the user menu, drop the two Settings sections, and draw `help.svg`.

### Declared Files
- src/js/ui/router.js
- src/js/ui/user-menu.js
- src/js/app.js
- src/js/views/settings.js
- src/img/icons.svg
- src/service-worker.js
- src/css/views.css
- docs/requirements.md
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- scripts/draw-wireframes.py
- tests/unit/router.test.js
- tests/unit/user-menu.test.js
- tests/unit/settings.test.js
- tests/test_draw_wireframes.py
- tests/e2e/bin-settings.spec.js

Added files, outside the size count: `src/js/views/help.js`, `src/js/ui/markdown.js`,
`src/vendor/support-js/changelog-parser.mjs`, `tests/unit/markdown.test.js`, `tests/unit/help.test.js`,
`tests/e2e/help.spec.js`.

Mechanical command: python scripts/draw-wireframes.py docs/img/ui
Mechanical files: docs/img/ui/*.svg

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Tests
- Unit: `parseHelpDoc` splits title, intro, and parts, renders the subset, keeps `<script>` as text, and filters links.
- Unit: the real `docs/tutorial` docs match the T0309 structure contract, and `faq.md` asks "Which keyboard shortcuts can I use?".
- Unit: the Help view builds five panels in order, FAQ items from `faq.md`, releases from a changelog fixture, and the version.
- Unit: one failed fetch shows Retry in its panel only, and Retry reloads it.
- Unit: the router resolves `#/help`, the menu lists Help last, and Settings has no Keyboard shortcuts or About section.
- Integration: at 390 and 1440 px, the user menu opens Help, searching "shortcut" finds the keyboard FAQ,
  the Release notes chip shows the current version, and Help reloads offline after a first visit.

Completion check: python scripts/devops.py check

Size estimate: 16 files, 700 lines

Size note: Moving Shortcuts and About from Settings to Help spans the route, menu, Settings, specs, wireframes, and tests;
a split leaves them shown twice or nowhere.
