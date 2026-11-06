### Decisions
- **[Decided]** Remove sidebar list creation entirely, following the latest human review.
- **[Decided]** Preserve the existing Lists navigation link and icon, and the main Lists view floating plus.

### Declared Files
- [layout.js](../../../src/js/ui/layout.js)
- [app-chrome.css](../../../src/css/app-chrome.css)
- [layout.test.js](../../../tests/unit/layout.test.js)
- [lists.spec.js](../../../tests/e2e/lists.spec.js)
- [shell.spec.js](../../../tests/e2e/shell.spec.js)
- [visual-style-gallery.html](../../../src/demo/visual-style-gallery.html)
- [visual-style-guide.md](../../../docs/specs/visual-style-guide.md)
- CHANGELOG.md

Size estimate: 8 files, 100 lines

### Tests
- Unit: the sidebar has no creation link or icon button, and retains the Tasks and Lists navigation links.
- Integration: the main Lists view plus remains visible and opens the list editor by keyboard and pointer.

Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`

### Integration metadata
- [package.json](../../../package.json): advanced the development patch version when landing the approved change.

Size note: Nine counted files keep one sidebar concern together with required documentation and release metadata.

- [service-worker.js](../../../src/service-worker.js): advanced the cache version for changed precached assets.
- Generated cache manifest: `node scripts/check-sw-version.mjs --update`.
