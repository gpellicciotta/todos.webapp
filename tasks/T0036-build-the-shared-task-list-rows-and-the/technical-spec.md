## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- src/js/views/add-bar.js
- tests/unit/task-list.test.js
- tests/unit/add-bar.test.js

Size estimate: 4 files, 710 lines
Size note: the row module and its tests form one unit that the List screen reuses.

### Tests
- Unit: rows render each status, the overdue chip, list chips with a +n count, and the notes count.
- Unit: the status menu changes a task's status; delete moves it to the recycle bin with an Undo toast.
- Unit: Enter in the add bar adds the task and keeps focus; the field stops at 500 characters.
- Integration: none (the All tasks screen task T0016 covers these modules end to end).

Completion check: `npm test && npm run lint`
