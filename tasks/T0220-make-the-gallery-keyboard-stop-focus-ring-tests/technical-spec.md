## Technical Specifications

### Background
- The tests are "every keyboard stop in the ... sections shows a focus ring" at 390 px and 1440 px.
- They live in `gallery-controls.spec.js`, `gallery-app.spec.js`, and `gallery-chrome.spec.js` under `tests/e2e/`.
- `gallery-app` and `gallery-chrome` make two round trips per Tab: `keyboard.press`, then `page.evaluate`.
- `gallery-controls` records stops in a `focusin` listener, so it makes one round trip per Tab.
- `gallery-app` and `gallery-chrome` start at `#toast .button` and Tab to the page end, through unrelated sections.
- Evidence: `.plan/tasks/T0214-list-the-keyboard-shortcuts-in-the-about-section/validation-proof.md`.

### Behavior
- **[Decided]** Keep real Tab presses; tab order and focus-visible matching are what the tests prove.
- **[Decided]** Move the `focusin` recorder into one shared helper used by all three specs.
- **[Decided]** Start Tab just before the first target section, and stop once focus passes the last one.
  - Compare document order with `compareDocumentPosition`, since sections of other specs may sit between targets.
- Keep each test's assertions: its minimum stop count, and an empty list of stops without a ring.
- Keep the 30 s default timeout; do not add `test.slow()` or a longer per-test timeout.
- If 8 s stays out of reach, record the measured times and ask before raising any timeout.

### Declared Files
- tests/e2e/helpers/focus-stops.js (new shared helper)
- tests/e2e/gallery-controls.spec.js
- tests/e2e/gallery-app.spec.js
- tests/e2e/gallery-chrome.spec.js

### Tests
- Unit: none; the change touches only e2e test code, which has no unit layer.
- Integration: each of the six tests passes alone in under 8 s, as Playwright reports.
- Integration: a missing ring still fails: remove the outline of one specimen and see the test list it.
- Integration: the six tests pass under load with `--repeat-each=3 --workers=6`.
- Integration: the full `npx playwright test` suite passes.
