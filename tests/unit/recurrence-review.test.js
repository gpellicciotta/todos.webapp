// @vitest-environment happy-dom
// Regression tests for the T0235 review round 1: the display rule in views and counts, ended series, the period-end
// fold order, and the undo of recurring events.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countLists } from '../../src/js/core/list-counts.js';
import { applyEvent, becameStale, firstOccurrence, foldEvents, normalizeRules } from '../../src/js/core/occurrences.js';
import { mountAllTasks } from '../../src/js/views/all-tasks.js';
import { createTaskList, statusActions, tickEvent } from '../../src/js/views/task-list.js';
import { freshStore } from './store-helpers.js';
import { shapeTask } from './task-shape.js';

const WEEKLY = normalizeRules({ 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' });
// The store clock starts on Wednesday 4 November 2026, 09:00 UTC; its Brussels week runs from 1 November 23:00 UTC.
const WEEK_ENDS = ['2026-11-08T23:00:00.000Z', '2026-11-15T23:00:00.000Z'];
const DAY_MS = 86_400_000;

/**
 * Build a weekly task completed in the week ending on 8 November, 23:00 UTC.
 * @param {object} [occurrence] occurrence fields over the completed one
 * @returns {object} the task
 */
function completedWeekly(occurrence = {}) {
  const task = shapeTask({ id: 'r1', description: 'Water the plants', status: 'completed' });
  task['lifecycle-rules'] = { ...task['lifecycle-rules'], ...WEEKLY };
  task['current-occurrence'] = {
    ...task['current-occurrence'], 'start-time': '2026-11-01T23:00:00.000Z', 'due-time': WEEK_ENDS[0], 'close-time': null, ...occurrence,
  };
  return task;
}

describe('the display rule before filters and counts', () => {
  let screen;

  afterEach(() => {
    screen?.destroy();
    screen = null;
  });

  it('counts a recurring task past its period end as open, whatever status it closed the period with', () => {
    const task = completedWeekly();
    expect(countLists([task], [], new Date('2026-11-08T22:00:00Z')).all).toBe(0);
    expect(countLists([task], [], new Date('2026-11-09T08:00:00Z')).all).toBe(1);
  });

  it('tells when a task passed its period end since the last render', () => {
    const task = completedWeekly();
    expect(becameStale([task], '2026-11-08T22:00:00Z', '2026-11-08T23:00:00Z')).toBe(true);
    expect(becameStale([task], '2026-11-08T23:00:00Z', '2026-11-08T23:01:00Z')).toBe(false);
  });

  it('shows a recurring task completed last period under the default open filter once its period ended', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    let clock = new Date('2026-11-08T22:00:00Z');
    const intervals = [];
    vi.spyOn(globalThis, 'setInterval').mockImplementation((run) => {
      intervals.push(run);
      return intervals.length;
    });
    const store = { snapshot: async () => ({ lists: [], tasks: [completedWeekly()], memberships: [], notes: [] }), subscribe: () => () => {} };
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store, toaster: { show: vi.fn() }, now: () => clock, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    expect(document.querySelector('.task-row[data-task-id="r1"]')).toBeNull();
    clock = new Date('2026-11-09T08:00:00Z');
    intervals.forEach((run) => run());
    expect(document.querySelector('.task-row[data-task-id="r1"]')?.dataset.status).toBe('ready');
    vi.restoreAllMocks();
  });
});

describe('ended recurring series', () => {
  const ended = (status) => completedWeekly({ status, 'completion-count': status === 'completed' ? 1 : 0, 'close-time': WEEK_ENDS[0] });

  it('takes only reopen on a closed recurring occurrence, completed or cancelled', () => {
    for (const status of ['completed', 'cancelled']) {
      const occurrence = ended(status)['current-occurrence'];
      for (const type of ['complete', 'uncomplete', 'start', 'unstart', 'cancel', 'expire']) {
        expect(applyEvent(occurrence, { type, 'creation-time': WEEK_ENDS[0] }, WEEKLY)).toBeNull();
      }
      expect(applyEvent(occurrence, { type: 'reopen', 'creation-time': WEEK_ENDS[0] }, WEEKLY)).toMatchObject({ status: 'ready', 'close-time': null });
    }
  });

  it('offers only Reopen on the row of a series that ended completed', () => {
    const task = ended('completed');
    expect(tickEvent(task['current-occurrence'], task['lifecycle-rules'])).toBe('reopen');
    expect(statusActions(task['current-occurrence'], task['lifecycle-rules']).map(({ event }) => event)).toEqual(['reopen']);
    document.body.innerHTML = '';
    const list = createTaskList({ document, store: { postEvent: vi.fn() }, toaster: { show: vi.fn() }, label: 'Tasks', hrefOf: () => '#' });
    document.body.append(list.element);
    list.render([task], { now: new Date('2026-11-09T08:00:00Z') });
    expect(document.querySelector('.status-button').getAttribute('aria-label')).toBe('Reopen Water the plants');
    list.destroy();
  });

  it('refuses other events on an ended series in the store, and reopens it once its end rules allow', async () => {
    const { store, clock } = await freshStore();
    const task = await store.createTask({ description: 'Once', 'lifecycle-rules': { ...WEEKLY, 'recurrence-end-count': 1 } });
    await store.postEvent(task.id, 'complete');
    clock.tick(7 * DAY_MS);
    expect((await store.rollOverTask(task.id))['current-occurrence']).toMatchObject({ occurrence: 1, status: 'completed', 'close-time': WEEK_ENDS[0] });
    for (const type of ['uncomplete', 'cancel', 'complete']) {
      await expect(store.postEvent(task.id, type)).rejects.toMatchObject({ code: 'conflict' });
    }
    await expect(store.postEvent(task.id, 'reopen')).rejects.toMatchObject({ code: 'conflict' });
    await store.updateRules(task.id, { 'recurrence-end-count': 3 });
    const { task: reopened } = await store.postEvent(task.id, 'reopen');
    expect(reopened['current-occurrence']).toMatchObject({ occurrence: 2, status: 'ready', 'start-time': WEEK_ENDS[0], 'due-time': WEEK_ENDS[1] });
    store.close();
  });
});

describe('the period-end fold order', () => {
  it('folds the event that ends a recurring period last, also at the same time', () => {
    const rules = normalizeRules({ ...WEEKLY, 'recurrence-end-count': 1 });
    const open = firstOccurrence(rules, '2026-11-04T09:00:00.000Z');
    const events = [
      { id: 'a', type: 'end-recurrence', 'creation-time': WEEK_ENDS[0] },
      { id: 'b', type: 'complete', 'creation-time': WEEK_ENDS[0] },
    ];
    expect(foldEvents(open, events, rules)).toMatchObject({ 'completion-count': 1, status: 'completed', 'close-time': WEEK_ENDS[0] });
  });
});

describe('undoing recurring events', () => {
  /**
   * Open a connected store with a weekly task.
   * @returns {Promise<{store: object, clock: object, task: object}>} the store, its clock, and the task
   */
  async function connected() {
    const { store, clock } = await freshStore({ tracking: () => true });
    const task = await store.createTask({ description: 'Water the plants', 'lifecycle-rules': WEEKLY });
    return { store, clock, task };
  }

  const entryOf = async (store, eventId) => (await store.queue.all()).find((entry) => entry.target.id === eventId);

  it('leaves the current occurrence alone when a grace event for the previous one is undone', async () => {
    const { store, clock, task } = await connected();
    // The service rolled the task over into week 2, where it holds one tick.
    const rolled = { occurrence: 2, 'start-time': WEEK_ENDS[0], 'due-time': WEEK_ENDS[1], 'target-count': 1, 'completion-count': 0, status: 'ready', 'close-time': null };
    const put = (occurrence) => store.applyChanges((data) => ({
      changes: { put: { tasks: [{ ...data.tasks.find((candidate) => candidate.id === task.id), 'current-occurrence': occurrence }] } }, result: null,
    }));
    await put(rolled);
    clock.now = Date.parse(WEEK_ENDS[0]) + 3_600_000;
    const { event } = await store.postEvent(task.id, 'complete', { occurrence: 1 });
    await put({ ...rolled, 'completion-count': 1, status: 'completed' });
    await store.queue.undo(store, await entryOf(store, event.id));
    expect((await store.getTask(task.id))['current-occurrence']).toMatchObject({ occurrence: 2, 'completion-count': 1, status: 'completed' });
    expect((await store.eventsOfTask(task.id)).some((stored) => stored.id === event.id)).toBe(false);
    store.close();
  });

  it('gives back the whole occurrence before an event that opened the next period', async () => {
    const { store, clock, task } = await connected();
    await store.postEvent(task.id, 'complete');
    const before = (await store.getTask(task.id))['current-occurrence'];
    clock.tick(7 * DAY_MS);
    const { event, task: after } = await store.postEvent(task.id, 'complete');
    expect(after['current-occurrence'].occurrence).toBe(2);
    await store.queue.undo(store, await entryOf(store, event.id));
    expect((await store.getTask(task.id))['current-occurrence']).toEqual(before);
    store.close();
  });

  it('gives back the closed occurrence when a recurring reopen is undone', async () => {
    const { store, clock, task } = await connected();
    await store.postEvent(task.id, 'cancel');
    const before = (await store.getTask(task.id))['current-occurrence'];
    clock.tick(7 * DAY_MS);
    const { event, task: after } = await store.postEvent(task.id, 'reopen');
    expect(after['current-occurrence'].occurrence).toBe(2);
    await store.queue.undo(store, await entryOf(store, event.id));
    expect((await store.getTask(task.id))['current-occurrence']).toEqual(before);
    store.close();
  });
});
