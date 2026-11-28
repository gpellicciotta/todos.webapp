### Declared Files
- scripts/draw-wireframes.py
- playwright.config.js
- docs/devops.md

### Tests
- Unit: tests/test_draw_wireframes.py checks every shape of settings.svg and import.svg stays inside its frame.
- Integration: tests/e2e/reminders-real.spec.js raises a real notification in Chrome and Firefox.

Completion check: python scripts/devops.py test tests/test_draw_wireframes.py
