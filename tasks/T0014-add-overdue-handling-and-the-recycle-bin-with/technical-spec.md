## Technical Specifications

### Declared Files
- src/js/core/overdue.js
- src/js/store/bin.js
- src/js/store/lists.js
- src/js/store/tasks.js
- tests/unit/overdue.test.js
- tests/unit/bin.test.js

Size estimate: 6 files, 400 lines

### Tests
- Unit: a task is overdue only when its due time passed and its status is `todo` or `in-progress`.
- Unit: overdue handling cancels `cancel` tasks and never changes deleted, completed, or cancelled tasks.
- Unit: deleting a list keeps its tasks in their other lists or in no list.
- Unit: restoring a list or task brings back all memberships; deleted tasks reject edits.
- Unit: purge removes entries deleted more than 30 days ago and keeps younger ones.
- Integration: with a fake clock, the one-minute timer cancels a task right after its due time.

Completion check: `npm test && npm run lint`
