### Declared Files
- src/img/app-icon.svg
- src/service-worker.js
- docs/devops.md
- CHANGELOG.md

### Tests
- Unit: none (asset change; `npm run check:sw` guards the precache VERSION and hashes)
- Integration: none (visual check of the rendered 192 and 512 PNG icons and the 16 px favicon)

Completion check: `npm run check:sw`
