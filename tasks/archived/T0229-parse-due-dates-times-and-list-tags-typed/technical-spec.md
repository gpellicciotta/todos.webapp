## Technical Specifications

### Declared Files
- src/js/views/add-bar.js
- src/js/views/settings.js
- tests/unit/add-bar.test.js
- tests/e2e/all-tasks.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- New, not counted: src/js/core/quick-add.js and tests/unit/quick-add.test.js.
- Added during execution: src/js/views/all-tasks.js and src/js/views/list.js, which pass the due time and lists.
- Added during execution: src/index.html and src/service-worker.js, which preload and precache the new module.
- Added during execution: src/css/app-components.css, for the preview line.
- Added during execution: tests/unit/list.test.js and tests/unit/settings.test.js.
- Generated, not counted: scripts/sw-precache-hashes.json, by `node scripts/check-sw-version.mjs --update`.

Mechanical command: `node scripts/check-sw-version.mjs --update`

Size note: 13 counted files and 276 lines; both views and the worker lists must change for one mergeable feature.

### Requirements
- Dates: `today`, `tomorrow`, weekday names meaning the next such day, and `yyyy-mm-dd`.
- Times: `hh:mm` in 24-hour form, and `h am` or `h pm`; a time without a date means today, or tomorrow if passed.
- A date without a time keeps the date-only rule of `TSK-6`.
- Lists: `#name` matches a list name ignoring case and accents (`LST-10`), using the list find helpers.
- Only lists the user may add tasks to match (`SHR-4`).
- Search still uses the raw typed text, so typing syntax never hides matching tasks.
- Proposal for the Decide step: a backslash before a token keeps it literal, such as `\tomorrow`.
- Proposal for the Decide step: an unknown `#tag` stays in the description and the preview offers no list.
- The preview line names the due time and lists, such as "Due tomorrow 18:00 · List: Home".
- In a list view, the view's list stays a membership, and tags add more lists.
- The parser is a pure function of the text, the current time, and the list names, for easy testing.

### Tests
- Unit: each date and time form, combined forms, and tokens in any position of the text.
- Unit: weekday names roll to next week on the same day after the time passes.
- Unit: list tags match case- and accent-insensitively, and skip lists the user cannot add to.
- Unit: escaped tokens stay literal, and text without tokens stays unchanged.
- Integration: e2e adds `Buy paint tomorrow 18:00 #home` in All tasks and finds the task due tomorrow 18:00 in Home.

Completion check: `npm run test:unit` and the all-tasks e2e spec pass.
