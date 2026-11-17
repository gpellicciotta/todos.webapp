## Icon Mapping
Source folders are `src/img/app-icons/{{style}}/` in support.webapp; see the [app icons spec](https://github.com/gpellicciotta/support.webapp/blob/main/docs/specs/app-icons.md).

| Use                                              | Style              | Source file                                | Target                     |
| :----------------------------------------------- | :----------------- | :----------------------------------------- | :------------------------- |
| Favicon                                          | `blue-flat`        | `todos-icon.ico`                           | `src/favicon.ico`          |
| SVG favicon, sidebar brand, gallery demo         | `blue-flat`        | `todos-icon.svg`                           | `src/img/todos-icon.svg`   |
| Settings logo and notification icon              | `blue-flat`        | `todos-icon-192.png`                       | `src/img/`                 |
| Mail logo used by todos.server                   | `blue-flat`        | `todos-icon-128.png`                       | `src/img/`                 |
| Apple touch icon                                 | `blue-dimensional` | `todos-apple-touch-icon.png`               | `src/img/install/`         |
| Manifest `any` icons                             | `blue-dimensional` | `todos-icon-192.png`, `todos-icon-512.png` | `src/img/install/`         |
| Manifest `maskable` icons                        | `blue-dimensional` | `todos-icon-maskable-{192,512}.png`        | `src/img/install/`         |

Notes:
- Drop the manifest's SVG entry, so installs use the dimensional PNGs.
- Replace `src/img/app-icon.svg`, `app-icon-192.png`, and `app-icon-512.png`, and delete `scripts/render-app-icons.mjs`.
- auth's presets use `https://todos.pellicciotta.com/img/todos-icon.svg` as the todos logo URL; it now resolves.
- Add every new icon to the `PRECACHE` list of `src/service-worker.js`, bump `VERSION`, and refresh the hashes.
- Add the Lucide ISC notice from `todos-icon.svg` to `LICENSE.md` or a new notices file.

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Declared Files
- src/index.html
- src/manifest.webmanifest
- src/service-worker.js
- src/js/app.js
- src/js/ui/layout.js
- src/js/views/settings.js
- src/demo/visual-style-gallery.html
- README.md
- docs/devops.md
- tests/e2e/pwa.spec.js
- tests/unit/session.test.js

`NOTICE.md` replaced the `LICENSE.md` edit, so GitHub still detects the MIT license; added files are not counted.
Size note: 11 counted files and 86 lines; the extra files are the docs, the e2e scenario, and a renamed test URL.

### Tests
- Unit: a test checks manifest `any` and `maskable` entries at 192 and 512 px point to existing files.
- Unit: a test checks the head links `favicon.ico`, the SVG icon, and the apple touch icon.
- Unit: a test checks the service worker precaches every icon that the head and manifest reference.
- Integration: load the app in Playwright; every icon URL returns 200 without console errors, also offline.

Completion check: python scripts/devops.py check
Size estimate: 8 files, 70 lines
