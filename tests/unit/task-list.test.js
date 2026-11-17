// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachReorder } from '../../src/js/views/reorder.js';
import { createTaskList, formatDue, tickEvent } from '../../src/js/views/task-list.js';
import { isShowing } from './popover-shim.js';
import { shapeTask } from './task-shape.js';

const NOW = new Date(2026, 10, 4, 9, 0); // Wednesday 4 November 2026, 09:00 local time

/**
 * Return the ISO time of a local date and time.
 * @param {number} day the day of November 2026
 * @param {number} hours the hours
 * @param {number} [minutes] the minutes
 * @returns {string} the ISO time
 */
function at(day, hours, minutes = 0) {
  return new Date(2026, 10, day, hours, minutes).toISOString();
}

/**
 * Count the menus that show; task rows open none.
 * @returns {number} the showing menus
 */
function menusShowing() {
  return [...document.querySelectorAll('.menu')].filter((menu) => isShowing(menu)).length;
}

describe('formatDue', () => {
  it('shows a relative time, and marks open tasks past their due time overdue while keeping the time (OVD-2)', () => {
    expect(formatDue(shapeTask({ 'due-time': null, status: 'ready' }), NOW, 'en-GB')).toBeNull();
    expect(formatDue(shapeTask({ 'due-time': at(4, 8), status: 'ready' }), NOW, 'en-GB')).toEqual({ text: 'Today 08:00', overdue: true });
    expect(formatDue(shapeTask({ 'due-time': at(3, 10), status: 'in-progress' }), NOW, 'en-GB')).toEqual({ text: 'Yesterday 10:00', overdue: true });
    expect(formatDue(shapeTask({ 'due-time': at(3, 23, 59), status: 'ready' }), NOW, 'en-GB')).toEqual({ text: 'Yesterday', overdue: true });
    expect(formatDue(shapeTask({ 'due-time': at(1, 9), status: 'ready' }), NOW, 'en-GB')).toEqual({ text: '1 Nov', overdue: true });
    expect(formatDue(shapeTask({ 'due-time': at(4, 8), status: 'completed' }), NOW, 'en-GB')).toEqual({ text: 'Today 08:00', overdue: false });
    expect(formatDue(shapeTask({ 'due-time': at(4, 18), status: 'ready' }), NOW, 'en-GB')).toEqual({ text: 'Today 18:00', overdue: false });
    expect(formatDue(shapeTask({ 'due-time': at(5, 18), status: 'ready' }), NOW, 'en-GB').text).toBe('Tomorrow 18:00');
    expect(formatDue(shapeTask({ 'due-time': at(5, 23, 59), status: 'ready' }), NOW, 'en-GB').text).toBe('Tomorrow');
    expect(formatDue(shapeTask({ 'due-time': at(9, 10), status: 'ready' }), NOW, 'en-GB').text).toBe('Mon 10:00');
    expect(formatDue(shapeTask({ 'due-time': at(12, 23, 59), status: 'ready' }), NOW, 'en-GB').text).toBe('12 Nov');
    expect(formatDue(shapeTask({ 'due-time': new Date(2027, 0, 3, 23, 59).toISOString(), status: 'ready' }), NOW, 'en-GB').text).toBe('3 Jan 2027');
  });
});

describe('tickEvent', () => {
  const tickOf = (status, target, count = undefined) => {
    const task = shapeTask({ status, 'target-count': target, ...(count === undefined ? {} : { 'completion-count': count }) });
    return tickEvent(task['current-occurrence'], task['lifecycle-rules']);
  };

  it('completes open tasks at target 1, and leaves completed and cancelled ones alone (TSK-4)', () => {
    expect(tickOf('ready', 1)).toBe('complete');
    expect(tickOf('in-progress', 1)).toBe('complete');
    expect(tickOf('completed', 1)).toBeNull();
    expect(tickOf('cancelled', 1)).toBeNull();
  });

  it('completes every status but cancelled above target 1, also past the target (TSK-4)', () => {
    expect(tickOf('ready', 3, 0)).toBe('complete');
    expect(tickOf('in-progress', 3, 2)).toBe('complete');
    expect(tickOf('completed', 3, 3)).toBe('complete');
    expect(tickOf('completed', 3, 4)).toBe('complete');
    expect(tickOf('cancelled', 3, 2)).toBeNull();
  });

  it('leaves a closed recurring series alone, completed or cancelled', () => {
    const rules = { ...shapeTask()['lifecycle-rules'], 'recurrence-unit': 'week', 'recurrence-interval': 1 };
    for (const status of ['completed', 'cancelled']) {
      const occurrence = { ...shapeTask({ status, 'target-count': 3, 'completion-count': 3 })['current-occurrence'], 'close-time': at(2, 0) };
      expect(tickEvent(occurrence, { ...rules, 'target-count': 3 }), status).toBeNull();
    }
  });
});

describe('createTaskList', () => {
  let store;
  let toaster;
  let list;
  const tasks = [
    shapeTask({ id: 't1', description: 'Call the plumber', status: 'in-progress', 'due-time': at(3, 10) }),
    shapeTask({ id: 't2', description: 'Buy paint', status: 'ready', 'due-time': null }),
    shapeTask({ id: 't3', description: 'Water the plants', status: 'completed', 'due-time': null }),
  ];
  const ctx = {
    now: NOW,
    lists: new Map([['l1', { id: 'l1', name: 'Home' }], ['l2', { id: 'l2', name: 'Errands' }], ['l3', { id: 'l3', name: 'Work' }]]),
    listsByTask: new Map([['t1', ['l1', 'l2', 'l3']], ['t2', ['l1']]]),
    notesByTask: new Map([['t1', ['one', 'two']]]),
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    store = {
      updateTask: vi.fn(async () => ({})),
      postEvent: vi.fn(async () => ({})),
      deleteTask: vi.fn(async () => ({})),
      restoreTask: vi.fn(async () => ({})),
      addToList: vi.fn(async () => true),
    };
    toaster = { show: vi.fn() };
    list = createTaskList({ document, store, toaster, label: 'All tasks', hrefOf: (task) => `#/tasks/${task.id}` });
    document.body.append(list.element);
    list.render(tasks, ctx);
  });

  afterEach(() => {
    list.destroy();
  });

  it('renders one row per task: the description line, then a meta line with the due text and the lists', () => {
    const rows = [...document.querySelectorAll('.task-row')];
    expect(rows.map((row) => row.dataset.status)).toEqual(['in-progress', 'ready', 'completed']);
    const first = rows[0];
    expect(first.querySelector('.status-button').getAttribute('aria-label')).toBe('Mark Call the plumber completed');
    expect(first.querySelector('.status-button use').getAttribute('href')).toBe('img/icons.svg#status-in-progress');
    const open = first.querySelector('.task-row__open');
    expect(open.getAttribute('href')).toBe('#/tasks/t1');
    expect([...open.children].map((child) => child.className)).toEqual(['task-row__description', 'task-row__meta']);
    const meta = open.querySelector('.task-row__meta');
    expect([...meta.children].map((child) => child.className)).toEqual(['task-row__due task-row__due--overdue', 'task-row__lists']);
    expect(meta.querySelector('.task-row__due').textContent).toBe('Yesterday 10:00');
    expect(meta.querySelector('.task-row__due use').getAttribute('href')).toBe('img/icons.svg#clock');
    expect([...meta.querySelectorAll('.task-row__list')].map((name) => name.textContent)).toEqual(['Home', 'Errands']);
    expect(meta.querySelector('.task-row__more-lists').textContent).toBe('+1 more lists');
    expect([...rows[1].querySelector('.task-row__meta').children].map((child) => child.className)).toEqual(['task-row__lists']);
    expect(rows[2].querySelector('.task-row__meta')).toBeNull();
    expect(document.querySelector('.task-list').getAttribute('aria-label')).toBe('All tasks');
  });

  it('marks only overdue due text for the danger color, and renders no Overdue chip (OVD-2)', () => {
    list.render([
      shapeTask({ id: 'late', description: 'Pay the rent', status: 'ready', 'due-time': at(4, 8) }),
      shapeTask({ id: 'soon', description: 'Buy bread', status: 'ready', 'due-time': at(4, 18) }),
      shapeTask({ id: 'done', description: 'Post the letter', status: 'completed', 'due-time': at(4, 8) }),
    ], ctx);
    const dueOf = (id) => document.querySelector(`.task-row[data-task-id="${id}"] .task-row__due`);
    expect(dueOf('late').classList.contains('task-row__due--overdue')).toBe(true);
    expect(dueOf('late').textContent).toBe('Today 08:00');
    expect(dueOf('soon').classList.contains('task-row__due--overdue')).toBe(false);
    expect(dueOf('soon').textContent).toBe('Today 18:00');
    expect(dueOf('done').classList.contains('task-row__due--overdue')).toBe(false);
    expect(document.querySelector('.chip--overdue')).toBeNull();
    expect(document.querySelector('.task-list').textContent).not.toContain('Overdue');
  });

  it('renders no note count, no people icon, and no chips on any row', () => {
    expect(document.querySelector('.task-row__notes, .task-row__shared, .task-row .chip')).toBeNull();
    expect(document.querySelector('.task-row use[href$="#note"], .task-row use[href$="#people"]')).toBeNull();
  });

  it('marks the selected task with aria-current', () => {
    list.setSelected('t2');
    expect(document.querySelector('[aria-current="page"]').getAttribute('href')).toBe('#/tasks/t2');
    list.setSelected(null);
    expect(document.querySelector('[aria-current]')).toBeNull();
  });

  it('builds no menu next to the list, and rows end with no More button or other trailing control', () => {
    expect(document.querySelector('.task-list-frame .menu, .status-menu')).toBeNull();
    expect(document.querySelector('.task-row__more, [data-role="more"], .task-row [aria-haspopup]')).toBeNull();
    for (const row of document.querySelectorAll('.task-row')) {
      expect([...row.children].map((child) => child.dataset.role)).toEqual(['status', 'open']);
      expect(row.lastElementChild.classList.contains('task-row__open')).toBe(true);
    }
  });

  it('opens no row menu from any key on any row control', () => {
    const keys = [['Enter'], [' '], ['ArrowDown'], ['ArrowUp'], ['F10', { shiftKey: true }], ['ContextMenu']];
    for (const control of document.querySelectorAll('.task-row [data-role]')) {
      for (const [key, extra] of keys) {
        control.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
        expect(menusShowing(), `${control.dataset.role} ${key}`).toBe(0);
      }
    }
    expect(document.querySelector('.menu')).toBeNull();
  });

  it('shows done and target counts as a badge on the status icon above target 1, and none at target 1', () => {
    list.render([
      shapeTask({ id: 'f', description: 'French exercises', status: 'in-progress', 'target-count': 3, 'completion-count': 2 }),
      shapeTask({ id: 'g', description: 'Gym', status: 'completed', 'target-count': 3, 'completion-count': 4 }),
      ...tasks,
    ], ctx);
    const rows = [...document.querySelectorAll('.task-row')];
    const badge = rows[0].querySelector('.status-button > .task-row__count');
    expect(badge.textContent).toBe('2/3');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(badge.previousElementSibling.matches('svg.icon')).toBe(true);
    expect(rows[0].querySelector('.status-button').dataset.status).toBe('in-progress');
    expect(rows[1].querySelector('.status-button > .task-row__count').textContent).toBe('4/3');
    expect(rows[1].querySelector('.status-button').dataset.status).toBe('completed');
    expect(document.querySelector('.task-row__meta .task-row__count')).toBeNull();
    expect(rows[0].querySelector('.task-row__meta')).toBeNull();
    expect(rows.slice(2).map((row) => row.querySelector('.task-row__count'))).toEqual([null, null, null]);
    expect(rows[0].querySelector('.status-button').getAttribute('aria-label')).toBe('Tick French exercises, 2 of 3 done');
    expect(rows[1].querySelector('.status-button').getAttribute('aria-label')).toBe('Tick Gym, 4 of 3 done');
    expect(rows[0].querySelector('.status-button').title).toBe('In progress, 2 of 3 done');
    expect(rows[1].querySelector('.status-button').title).toBe('Completed, 4 of 3 done');
  });

  it('ticks a target-3 task towards its target, and past it once completed', () => {
    const french = (count) => shapeTask({
      id: 'f', description: 'French exercises', status: count >= 3 ? 'completed' : count > 0 ? 'in-progress' : 'ready',
      'target-count': 3, 'completion-count': count,
    });
    list.render([french(2)], ctx);
    document.querySelector('.status-button').click();
    list.render([french(3)], ctx);
    expect(document.querySelector('.task-row__count').textContent).toBe('3/3');
    document.querySelector('.status-button').click();
    expect(store.postEvent.mock.calls).toEqual([['f', 'complete'], ['f', 'complete']]);
  });

  it('renders the row again when only its count changes', () => {
    const french = (count) => shapeTask({ id: 'f', description: 'French', status: 'in-progress', 'target-count': 3, 'completion-count': count });
    list.render([french(1)], ctx);
    const before = document.querySelector('.task-row');
    list.render([french(2)], ctx);
    expect(document.querySelector('.task-row')).not.toBe(before);
    expect(document.querySelector('.task-row__count').textContent).toBe('2/3');
  });

  describe('ticking, without a status menu (TSK-4)', () => {
    const four = [
      shapeTask({ id: 'a', description: 'Buy paint', status: 'ready', 'due-time': null }),
      shapeTask({ id: 'b', description: 'Call the plumber', status: 'in-progress', 'due-time': null }),
      shapeTask({ id: 'c', description: 'Water the plants', status: 'completed', 'due-time': null }),
      shapeTask({ id: 'd', description: 'Renew the gym pass', status: 'cancelled', 'due-time': null }),
    ];

    /**
     * Find the status button of a task.
     * @param {string} taskId the task identifier
     * @returns {HTMLButtonElement} the button
     */
    const statusOf = (taskId) => document.querySelector(`.task-row[data-task-id="${taskId}"] .status-button`);

    /**
     * Press a key on an element.
     * @param {Element} target the element
     * @param {string} key the key
     * @param {object} [extra] more event settings, such as modifier keys
     * @returns {KeyboardEvent} the event, to inspect its default handling
     */
    function press(target, key, extra = {}) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
      target.dispatchEvent(event);
      return event;
    }

    beforeEach(() => {
      list.render(four, ctx);
    });

    it('ticks: completes open tasks on one click, and never changes completed or cancelled ones at target 1', () => {
      for (const { id } of four) {
        statusOf(id).click();
      }
      expect(store.postEvent.mock.calls).toEqual([['a', 'complete'], ['b', 'complete']]);
      expect(store.updateTask).not.toHaveBeenCalled();
      expect(menusShowing()).toBe(0);
    });

    it('names the action of the click and the current status, without a menu popup', () => {
      expect(statusOf('a').getAttribute('aria-label')).toBe('Mark Buy paint completed');
      expect(statusOf('b').getAttribute('aria-label')).toBe('Mark Call the plumber completed');
      expect(statusOf('a').title).toBe('To do');
      expect(statusOf('b').title).toBe('In progress');
      expect(statusOf('a').hasAttribute('aria-haspopup')).toBe(false);
      expect(statusOf('a').hasAttribute('aria-disabled')).toBe(false);
      expect(statusOf('b').hasAttribute('aria-disabled')).toBe(false);
    });

    it('marks an inert status button aria-disabled, focusable, and named by its status alone', () => {
      expect(statusOf('c').getAttribute('aria-label')).toBe('Water the plants, completed');
      expect(statusOf('d').getAttribute('aria-label')).toBe('Renew the gym pass, cancelled');
      list.render([shapeTask({ id: 'g', description: 'Gym', status: 'cancelled', 'target-count': 3, 'completion-count': 2 })], ctx);
      expect(statusOf('g').getAttribute('aria-label')).toBe('Gym, cancelled, 2 of 3 done');
      list.render(four, ctx);
      for (const id of ['c', 'd']) {
        expect(statusOf(id).getAttribute('aria-disabled'), id).toBe('true');
        expect(statusOf(id).disabled, id).toBe(false);
        expect(statusOf(id).title, id).toBe('Open the task to change its status.');
        statusOf(id).focus();
        expect(document.activeElement, id).toBe(statusOf(id));
      }
    });

    it('opens no menu on a right-click of the status button, and leaves the browser its own menu', async () => {
      for (const { id } of four) {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        statusOf(id).dispatchEvent(event);
        expect(event.defaultPrevented, id).toBe(false);
        expect(menusShowing(), id).toBe(0);
      }
      await new Promise((resolve) => setTimeout(resolve));
      expect(store.postEvent).not.toHaveBeenCalled();
    });

    it('opens no menu on Down, Up, Shift+F10, or the Menu key, and leaves those keys to the browser', async () => {
      for (const id of ['a', 'b', 'c', 'd']) {
        for (const [key, extra] of [['ArrowDown'], ['ArrowUp'], ['F10', { shiftKey: true }], ['ContextMenu']]) {
          statusOf(id).focus();
          expect(press(statusOf(id), key, extra).defaultPrevented, `${id} ${key}`).toBe(false);
          expect(menusShowing(), `${id} ${key}`).toBe(0);
          expect(document.activeElement, `${id} ${key}`).toBe(statusOf(id));
        }
      }
      await new Promise((resolve) => setTimeout(resolve));
      expect(store.postEvent).not.toHaveBeenCalled();
    });

    it('opens no menu on a long press by touch, so its release ticks like any tap', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const button = statusOf('a');
        button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 10, clientY: 10 }));
        vi.advanceTimersByTime(2000);
        expect(menusShowing()).toBe(0);
        button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
        button.click();
        expect(menusShowing()).toBe(0);
        expect(store.postEvent.mock.calls).toEqual([['a', 'complete']]);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it('ticks the focused row with x, from any control of the row', () => {
      const open = document.querySelector('.task-row[data-task-id="b"] .task-row__open');
      open.focus();
      expect(press(open, 'x').defaultPrevented).toBe(true);
      statusOf('a').focus();
      press(statusOf('a'), 'x');
      expect(store.postEvent.mock.calls).toEqual([['b', 'complete'], ['a', 'complete']]);
    });

    it('posts nothing on x in a row whose click is inert', async () => {
      for (const id of ['c', 'd']) {
        const open = document.querySelector(`.task-row[data-task-id="${id}"] .task-row__open`);
        open.focus();
        press(open, 'x');
        statusOf(id).focus();
        press(statusOf(id), 'x');
      }
      await new Promise((resolve) => setTimeout(resolve));
      expect(store.postEvent).not.toHaveBeenCalled();
      expect(toaster.show).not.toHaveBeenCalled();
    });

    it('ignores x with a modifier key, and x typed in a text field', () => {
      const open = document.querySelector('.task-row[data-task-id="a"] .task-row__open');
      open.focus();
      press(open, 'x', { ctrlKey: true });
      press(open, 'X', { shiftKey: true });
      const input = document.createElement('input');
      document.body.append(input);
      input.focus();
      press(input, 'x');
      const field = document.createElement('input');
      document.querySelector('.task-row[data-task-id="a"]').append(field);
      field.focus();
      press(field, 'x');
      expect(store.postEvent).not.toHaveBeenCalled();
    });

    it('lets a viewer neither click, press x, nor open the menu (SHR-4)', () => {
      const viewer = {
        now: NOW, userId: 3,
        lists: new Map([['l1', { id: 'l1', name: 'Home', role: 'viewer', owner: { id: 9 } }]]),
        listsByTask: new Map([['a', ['l1']]]),
      };
      list.render([{ ...four[0], 'owner-id': 9 }], viewer);
      const button = statusOf('a');
      expect(button.disabled).toBe(true);
      expect(button.hasAttribute('aria-disabled')).toBe(false);
      button.click();
      button.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      const open = document.querySelector('.task-row__open');
      open.focus();
      press(open, 'x');
      expect(menusShowing()).toBe(0);
      expect(store.postEvent).not.toHaveBeenCalled();
    });

    it('shows the Undo toast for x too', async () => {
      const open = document.querySelector('.task-row[data-task-id="a"] .task-row__open');
      open.focus();
      press(open, 'x');
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(1));
      expect(toaster.show.mock.lastCall[0]).toBe('Task marked completed.');
    });

    it('shows an Undo toast after every tick, and Undo posts the inverse event', async () => {
      statusOf('a').click();
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(1));
      expect(toaster.show.mock.lastCall[0]).toBe('Task marked completed.');
      statusOf('b').click();
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(2));
      const [message, settings] = toaster.show.mock.lastCall;
      expect(message).toBe('Task marked completed.');
      expect(settings.undo).toBe(true);
      settings.onAction();
      expect(store.postEvent.mock.calls).toEqual([['a', 'complete'], ['b', 'complete'], ['b', 'uncomplete']]);
    });

    it('names the counts in the toast of a tick that changes only the count, and Undo posts uncomplete', async () => {
      const gym = (count) => shapeTask({
        id: 'g', description: 'Gym', status: count >= 3 ? 'completed' : count > 0 ? 'in-progress' : 'ready',
        'target-count': 3, 'completion-count': count,
      });
      list.render([gym(1)], ctx);
      statusOf('g').click();
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(1));
      expect(toaster.show.mock.lastCall[0]).toBe('Ticked, 2 of 3 done.');
      list.render([gym(2)], ctx);
      statusOf('g').click();
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(2));
      expect(toaster.show.mock.lastCall[0]).toBe('Task marked completed.');
      list.render([gym(3)], ctx);
      statusOf('g').click();
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(3));
      const [message, settings] = toaster.show.mock.lastCall;
      expect(message).toBe('Ticked, 4 of 3 done.');
      settings.onAction();
      expect(store.postEvent.mock.calls).toEqual([['g', 'complete'], ['g', 'complete'], ['g', 'complete'], ['g', 'uncomplete']]);
    });

    it('never asks the view filter whether a ticked row hides', async () => {
      const shows = vi.fn(() => false);
      list.render(four, ctx, { shows });
      statusOf('a').click();
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(1));
      expect(shows).not.toHaveBeenCalled();
    });
  });

  it('marks each status button with its status', () => {
    const buttons = [...document.querySelectorAll('.status-button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.dataset.status).toBe(button.closest('.task-row').dataset.status);
    }
  });

  describe('by role (SHR-4, SHR-5)', () => {
    const sam = { id: 9 };
    const mine = { id: 3 };
    const shared = (role) => ({
      now: NOW, userId: 3,
      lists: new Map([['l1', { id: 'l1', name: 'Home', role, owner: sam }], ['l2', { id: 'l2', name: 'Mine', role: 'owner', owner: mine }]]),
      listsByTask: new Map([['t1', ['l1']]]),
    });
    const foreign = [shapeTask({ id: 't1', description: 'Call the plumber', status: 'ready', 'due-time': null, 'owner-id': 9 })];

    /**
     * Render the foreign task for a role and return its row.
     * @param {string} role the role on the list holding the task
     * @param {string|null} [listId] the list a list view shows
     * @returns {HTMLLIElement} the row
     */
    function rowFor(role, listId = null) {
      list.destroy();
      list = createTaskList({ document, store, toaster, label: 'x', listId, hrefOf: (task) => `#/tasks/${task.id}` });
      document.body.replaceChildren(list.element);
      list.render(foreign, shared(role));
      return document.querySelector('.task-row');
    }

    it('locks the status of a viewer only, and gives no role a row menu: lists and Delete live in the editor', () => {
      for (const [role, listId] of [['viewer', null], ['task-editor', 'l1'], ['task-editor', null], ['owner', null]]) {
        const row = rowFor(role, listId);
        expect(row.querySelector('[data-role="status"]').disabled, role).toBe(role === 'viewer');
        expect(row.querySelector('[data-role="more"], [aria-haspopup]'), role).toBeNull();
        expect(document.querySelector('.menu'), role).toBeNull();
      }
    });
  });

  it('keeps focus on the same control when rows render again', () => {
    document.querySelectorAll('.status-button')[1].focus();
    list.render([...tasks].reverse(), ctx);
    expect(document.activeElement.closest('.task-row').dataset.taskId).toBe('t2');
    expect(document.activeElement.classList.contains('status-button')).toBe(true);
  });

  it('passes focus on to the row now at its place when the focused row leaves', () => {
    document.querySelectorAll('.status-button')[1].focus();
    list.render([tasks[0], tasks[2]], ctx);
    expect(document.activeElement.closest('.task-row').dataset.taskId).toBe('t3');
    expect(document.activeElement.classList.contains('status-button')).toBe(true);
  });

  it('keeps the other row elements when one task changes (TEC-16)', () => {
    const before = [...document.querySelectorAll('.task-row')];
    list.render([tasks[0], { ...tasks[1], description: 'Buy blue paint' }, tasks[2]], ctx);
    const after = [...document.querySelectorAll('.task-row')];
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(after[1]).not.toBe(before[1]);
    expect(after[1].querySelector('.task-row__description').textContent).toBe('Buy blue paint');
    expect(before[1].isConnected).toBe(false);
  });

  it('moves the existing row elements when the order changes, and drops the rows that left', () => {
    const before = [...document.querySelectorAll('.task-row')];
    list.render([tasks[2], tasks[0]], ctx);
    const moved = [...document.querySelectorAll('.task-row')];
    expect(moved.length).toBe(2);
    expect(moved[0]).toBe(before[2]);
    expect(moved[1]).toBe(before[0]);
    list.render([tasks[1], tasks[2], tasks[0]], ctx);
    const after = [...document.querySelectorAll('.task-row')];
    expect(after.map((row) => row.dataset.taskId)).toEqual(['t2', 't3', 't1']);
    expect(after[1]).toBe(before[2]);
    expect(after[2]).toBe(before[0]);
  });

  it('updates only the due chips on the clock tick, keeping rows and focus', () => {
    const due = shapeTask({ id: 't4', description: 'Pay the rent', status: 'ready', 'due-time': at(4, 10) });
    list.render([...tasks, due], ctx);
    const before = [...document.querySelectorAll('.task-row')];
    expect(before[3].querySelector('.task-row__due').textContent).toBe('Today 10:00');
    expect(before[3].querySelector('.task-row__due--overdue')).toBeNull();
    const focused = before[3].querySelector('.task-row__open');
    focused.focus();
    list.tick(new Date(2026, 10, 4, 10, 1));
    [...document.querySelectorAll('.task-row')].forEach((row, index) => expect(row).toBe(before[index]));
    expect(before[3].querySelector('.task-row__due--overdue').textContent).toBe('Today 10:00');
    expect(document.activeElement).toBe(focused);
  });

  it('renders every row of a list up to 200 tasks at once, with its place in the set', () => {
    const many = Array.from({ length: 200 }, (_, index) => shapeTask({ id: `m${index}`, description: `Task ${index}`, status: 'ready' }));
    list.render(many, ctx);
    const rows = [...document.querySelectorAll('.task-row')];
    expect(rows).toHaveLength(200);
    expect(rows.map((row) => row.getAttribute('aria-posinset'))).toEqual(many.map((_, index) => String(index + 1)));
    expect(rows.every((row) => row.getAttribute('aria-setsize') === '200')).toBe(true);
  });

  it('keeps every row of a render that changes more than 60 rows, replacing each in place', () => {
    const many = Array.from({ length: 150 }, (_, index) => shapeTask({ id: `m${index}`, description: `Task ${index}`, status: 'ready' }));
    list.render(many, ctx);
    list.render(many.map((task) => (shapeTask({ ...task, status: 'completed' }))), ctx);
    const rows = [...document.querySelectorAll('.task-row')];
    expect(rows).toHaveLength(150);
    expect(rows.every((row) => row.dataset.status === 'completed')).toBe(true);
  });

  describe('with a long list', () => {
    const ROW = 48;
    const many = Array.from({ length: 5000 }, (_, index) => shapeTask({ id: `m${index}`, description: `Task ${index}`, status: 'ready' }));
    let other;
    let scrolled;
    let reorder;
    let onMove;

    /**
     * List the rendered rows.
     * @returns {HTMLElement[]} the rows, top to bottom
     */
    const shown = () => [...other.element.querySelectorAll('.task-row')];

    /**
     * Find the rendered row of a task.
     * @param {string} taskId the task identifier
     * @returns {HTMLElement|undefined} the row
     */
    const rowOf = (taskId) => shown().find((row) => row.dataset.taskId === taskId);

    /**
     * Scroll the list so that a pixel offset of it sits at the top of the viewport, and fire the scroll event.
     * @param {number} offset the offset from the list's top
     */
    function scrollTo(offset) {
      scrolled = offset;
      document.dispatchEvent(new Event('scroll'));
    }

    beforeEach(async () => {
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(10 * ROW);
      scrolled = 0;
      onMove = vi.fn();
      other = createTaskList({
        document, store, toaster, label: 'Tasks', hrefOf: () => '#', moves: { enabled: () => true },
      });
      document.body.append(other.element);
      for (const element of [other.element, other.element.querySelector('.task-list')]) {
        element.getBoundingClientRect = () => ({ top: -scrolled, bottom: many.length * ROW - scrolled, height: many.length * ROW });
      }
      reorder = attachReorder(other.element, { enabled: () => true, onMove, ids: other.ids });
      other.render(many, ctx);
      // The first render shows the rows in view; the buffer rows follow once they painted.
      expect(shown()).toHaveLength(10);
      await vi.waitFor(() => expect(shown()).toHaveLength(30));
    });

    afterEach(() => {
      reorder.destroy();
      other.destroy();
      vi.restoreAllMocks();
    });

    it('renders only the visible rows plus a buffer, with spacers that keep the full height (TEC-16)', () => {
      expect(shown().map((row) => row.dataset.taskId)).toEqual(many.slice(0, 30).map((task) => task.id));
      const ul = other.element.querySelector('.task-list');
      expect(ul.style.paddingBlockStart).toBe('0px');
      expect(ul.style.paddingBlockEnd).toBe(`${(5000 - 30) * ROW}px`);
      expect(shown()[29].getAttribute('aria-posinset')).toBe('30');
      expect(shown()[29].getAttribute('aria-setsize')).toBe('5000');
      expect(other.ids()).toEqual(many.map((task) => task.id));
    });

    it('renders the rows that scroll into view and keeps the rows that stay', () => {
      scrollTo(1000 * ROW);
      expect(shown().map((row) => row.dataset.taskId)).toEqual(many.slice(980, 1030).map((task) => task.id));
      const ul = other.element.querySelector('.task-list');
      expect(ul.style.paddingBlockStart).toBe(`${980 * ROW}px`);
      expect(ul.style.paddingBlockEnd).toBe(`${(5000 - 1030) * ROW}px`);
      expect(shown()[0].getAttribute('aria-posinset')).toBe('981');
      const kept = rowOf('m1010');
      scrollTo(1005 * ROW);
      expect(rowOf('m1010')).toBe(kept);
      expect(shown()[0].dataset.taskId).toBe('m985');
    });

    it('keeps the focused row and its neighbors rendered while they scroll away', () => {
      const focused = rowOf('m5').querySelector('.task-row__open');
      focused.focus();
      scrollTo(2000 * ROW);
      expect(shown().slice(0, 3).map((row) => row.dataset.taskId)).toEqual(['m4', 'm5', 'm6']);
      expect(shown()[3].dataset.taskId).toBe('m1980');
      expect(shown()[3].style.marginBlockStart).toBe(`${(1980 - 7) * ROW}px`);
      expect(other.element.querySelector('.task-list').style.paddingBlockStart).toBe(`${4 * ROW}px`);
      expect(document.activeElement).toBe(focused);
    });

    it('moves the last rendered row down with Alt+Down, and scrolls it into view with focus kept', () => {
      const scroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
      const status = rowOf('m29').querySelector('.status-button');
      status.focus();
      status.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }));
      expect(onMove).toHaveBeenCalledWith('m29', { placement: { after: 'm30' }, index: 30 });
      const moved = [...many.slice(0, 29), many[30], many[29], ...many.slice(31)];
      other.render(moved, ctx);
      const row = rowOf('m29');
      expect(row.getAttribute('aria-posinset')).toBe('31');
      expect(document.activeElement).toBe(row.querySelector('.status-button'));
      expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
      expect(scroll.mock.contexts.at(-1)).toBe(row);
    });

    it('renders, scrolls to, and highlights a new task past the rendered rows for two seconds, across renders', () => {
      const scroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const added = shapeTask({ id: 'new', description: 'Coffee', status: 'ready' });
        const withAdded = [...many, added];
        other.render(withAdded, ctx);
        expect(rowOf('new')).toBeUndefined();
        expect(other.markAdded('new')).toBe(true);
        const row = rowOf('new');
        expect(row.classList.contains('task-row--added')).toBe(true);
        expect(scroll.mock.contexts.at(-1)).toBe(row);
        expect(shown().filter((each) => each.classList.contains('task-row--added'))).toHaveLength(1);
        scrollTo(4995 * ROW);
        other.render(withAdded, ctx);
        expect(rowOf('new').classList.contains('task-row--added')).toBe(true);
        vi.advanceTimersByTime(2000);
        expect(rowOf('new').classList.contains('task-row--added')).toBe(false);
        expect(other.markAdded('missing')).toBe(false);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it('moves the focused last rendered row with Alt+Down past the rendered rows', () => {
      const link = rowOf('m29').querySelector('.task-row__open');
      link.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }));
      expect(onMove).toHaveBeenCalledWith('m29', { placement: { after: 'm30' }, index: 30 });
    });

    it('drops a dragged row on a slot that was not rendered when the drag started, keeping the row rendered', () => {
      const handle = rowOf('m2').querySelector('.task-row__handle');
      const pointer = (target, type, clientY) => target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, button: 0, pointerId: 1, clientY,
      }));
      pointer(handle, 'pointerdown', 2 * ROW + 20);
      scrollTo(1000 * ROW);
      expect(rowOf('m2').dataset.dragging).toBe('true');
      pointer(other.element, 'pointermove', 5 * ROW);
      expect(rowOf('m1005').dataset.drop).toBe('before');
      pointer(other.element, 'pointerup', 5 * ROW);
      expect(onMove).toHaveBeenCalledWith('m2', { placement: { before: 'm1005' }, index: 1004 });
      expect(other.element.querySelector('[data-drop], [data-dragging]')).toBeNull();
    });

    it('drags a row by a press on its open link, never by its status button, and opens no editor on the drop (LV-3)', () => {
      reorder.destroy();
      reorder = attachReorder(other.element, { enabled: () => true, onMove, ids: other.ids, press: true, ends: true });
      const press = (target, type, clientY) => target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse', clientX: 40, clientY,
      }));
      const status = rowOf('m2').querySelector('.status-button');
      press(status, 'pointerdown', 2 * ROW + 20);
      press(status, 'pointermove', 4 * ROW);
      expect(rowOf('m2').hasAttribute('data-dragging')).toBe(false);
      press(status, 'pointerup', 4 * ROW);
      const open = rowOf('m2').querySelector('.task-row__open');
      press(open, 'pointerdown', 2 * ROW + 20);
      press(open, 'pointermove', 2 * ROW + 30);
      expect(rowOf('m2').dataset.dragging).toBe('true');
      press(other.element, 'pointermove', 5 * ROW);
      press(other.element, 'pointerup', 5 * ROW);
      expect(onMove).toHaveBeenCalledWith('m2', { placement: { before: 'm5' }, index: 4 });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      open.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
    });

    it('moves the focused row to the end with Alt+End and keeps focus on it in the new order (LV-3)', () => {
      reorder.destroy();
      reorder = attachReorder(other.element, { enabled: () => true, onMove, ids: other.ids, press: true, ends: true });
      const link = rowOf('m5').querySelector('.task-row__open');
      link.focus();
      link.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', altKey: true, bubbles: true, cancelable: true }));
      expect(onMove).toHaveBeenCalledWith('m5', { placement: { after: 'm4999' }, index: 4999 });
      other.render([...many.filter((task) => task.id !== 'm5'), many[5]], ctx);
      const focused = document.activeElement.closest('.task-row');
      expect(focused.dataset.taskId).toBe('m5');
      expect(focused.getAttribute('aria-posinset')).toBe('5000');
    });
  });

  describe('with a long grouped list', () => {
    const ROW = 48;
    const HEADER = 32;
    const groups = Array.from({ length: 50 }, (_, group) => ({
      key: `g${group}`,
      label: `Group ${group}`,
      tasks: Array.from({ length: 100 }, (_, index) => shapeTask({ id: `m${group * 100 + index}`, description: `Task ${group * 100 + index}`, status: 'ready' })),
    }));
    const TOTAL = 5000 * ROW + 50 * HEADER;
    let other;
    let scrolled;

    /**
     * Return the height above an item: every header before it at 32 px and every task row at 48 px.
     * @param {number} index the item index; a group takes 101 items
     * @returns {number} the offset in pixels
     */
    function offsetOf(index) {
      const headers = Math.ceil(index / 101);
      return headers * HEADER + (index - headers) * ROW;
    }

    /**
     * Scroll the list and fire the scroll event.
     * @param {number} offset the offset from the list's top
     */
    function scrollTo(offset) {
      scrolled = offset;
      document.dispatchEvent(new Event('scroll'));
    }

    /**
     * Add up the padding, the rendered items, and the gaps before them.
     * @returns {number} the height the list takes in pixels
     */
    function heightOfList() {
      const ul = other.element.querySelector('.task-list');
      let sum = parseFloat(ul.style.paddingBlockStart) + parseFloat(ul.style.paddingBlockEnd);
      for (const item of ul.children) {
        sum += (item.classList.contains('group-header') ? HEADER : ROW) + (parseFloat(item.style.marginBlockStart) || 0);
      }
      return sum;
    }

    beforeEach(async () => {
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(10 * ROW);
      scrolled = 0;
      other = createTaskList({ document, store, toaster, label: 'Tasks', hrefOf: () => '#' });
      document.body.append(other.element);
      for (const element of [other.element, other.element.querySelector('.task-list')]) {
        element.getBoundingClientRect = () => ({ top: -scrolled, bottom: TOTAL - scrolled, height: TOTAL });
      }
      other.render([], ctx, { groups });
      await vi.waitFor(() => expect(other.element.querySelectorAll('.task-list > li').length).toBeGreaterThan(20));
    });

    afterEach(() => {
      other.destroy();
      vi.restoreAllMocks();
    });

    it('renders the first header with the rows in view and a buffer, and keeps the full height', () => {
      const first = other.element.querySelector('.task-list').firstElementChild;
      expect(first.classList.contains('group-header')).toBe(true);
      expect(first.querySelector('.group-header__name').textContent).toBe('Group 0');
      expect(first.querySelector('.group-header__count').textContent).toBe('100');
      expect(first.getAttribute('aria-posinset')).toBe('1');
      expect(first.getAttribute('aria-setsize')).toBe('5050');
      expect(heightOfList()).toBe(TOTAL);
    });

    it('renders the rows and the header that scroll into view, from the offsets of mixed heights', () => {
      const index = 101 * 20 + 3;
      scrollTo(offsetOf(index));
      const items = [...other.element.querySelectorAll('.task-list > li')];
      const at = items.findIndex((item) => item.getAttribute('aria-posinset') === String(index + 1));
      expect(at).toBeGreaterThan(0);
      expect(items[at].dataset.taskId).toBe('m2002');
      expect(items.some((item) => item.classList.contains('group-header') && item.querySelector('.group-header__name').textContent === 'Group 20')).toBe(true);
      expect(items.length).toBeLessThan(80);
      expect(heightOfList()).toBe(TOTAL);
    });

    it('drops the rows of a collapsed group from the virtual window and the height, and keeps its header focused', () => {
      const toggle = other.element.querySelector('.group-header__toggle');
      toggle.focus();
      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(toggle);
      const items = [...other.element.querySelectorAll('.task-list > li')];
      expect(items[0].getAttribute('aria-setsize')).toBe('4950');
      expect(items[1].classList.contains('group-header')).toBe(true);
      expect(items[1].querySelector('.group-header__name').textContent).toBe('Group 1');
      expect(other.element.querySelector('[data-task-id="m0"]')).toBeNull();
      expect(heightOfList()).toBe(TOTAL - 100 * ROW);
      scrollTo(20 * (100 * ROW + HEADER));
      expect(other.element.querySelector('.task-list').contains(toggle)).toBe(true);
      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(heightOfList()).toBe(TOTAL);
    });

    it('keeps a task of two groups as two rows with separate keys', () => {
      const dup = shapeTask({ id: 'dup', description: 'Shared', status: 'ready' });
      other.render([], ctx, { groups: [
        { key: 'a', label: 'A', tasks: [dup] }, { key: 'b', label: 'B', tasks: [dup] },
      ] });
      const rows = [...other.element.querySelectorAll('.task-row')];
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((row) => row.dataset.rowKey)).size).toBe(2);
      expect(other.ids()).toEqual(['dup', 'dup']);
    });

    it('marks every row of the selected task and keeps focus on the same group row after a render', () => {
      const dup = shapeTask({ id: 'dup', description: 'Shared', status: 'ready' });
      const two = [{ key: 'a', label: 'A', tasks: [dup] }, { key: 'b', label: 'B', tasks: [dup] }];
      other.render([], ctx, { groups: two });
      other.setSelected('dup');
      expect(other.element.querySelectorAll('[aria-current="page"]')).toHaveLength(2);
      const second = other.element.querySelectorAll('.task-row')[1];
      second.querySelector('.status-button').focus();
      other.render([], ctx, { groups: two });
      expect(document.activeElement).toBe(other.element.querySelectorAll('.task-row')[1].querySelector('.status-button'));
      other.setSelected(null);
      expect(other.element.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
    });

    it('passes focus from a removed row to the next task row, not to a header', () => {
      const dup = shapeTask({ id: 'dup', description: 'Shared', status: 'ready' });
      const next = shapeTask({ id: 'next', description: 'Next', status: 'ready' });
      other.render([], ctx, { groups: [{ key: 'a', label: 'A', tasks: [dup] }, { key: 'b', label: 'B', tasks: [next] }] });
      other.element.querySelector('.task-row').querySelector('.status-button').focus();
      other.render([], ctx, { groups: [{ key: 'b', label: 'B', tasks: [next] }] });
      expect(document.activeElement.closest('.task-row').dataset.taskId).toBe('next');
    });
  });

  describe('with a long list of rows taller than 48 px', () => {
    const ROW = 48;
    const TALL = 96;
    const many = Array.from({ length: 5000 }, (_, index) => shapeTask({ id: `m${index}`, description: `Task ${index}`, status: 'ready' }));
    let other;
    let scrolled;
    let tallEvery;

    /**
     * Return the height of a task: every `tallEvery`-th task is 96 px high, the others 48 px.
     * @param {number} index the task index
     * @returns {number} the height in pixels
     */
    const heightOf = (index) => (tallEvery > 0 && index % tallEvery === 0 ? TALL : ROW);

    /**
     * Compute where the rendered rows sit, from the list's padding, the gap margins, and the row heights.
     * @returns {{top: number, bottom: number, index: number}[]} each row's top and bottom edge from the list's top
     */
    function placed() {
      const ul = other.element.querySelector('.task-list');
      let edge = parseFloat(ul.style.paddingBlockStart);
      return [...ul.children].map((row) => {
        edge += parseFloat(row.style.marginBlockStart) || 0;
        const index = Number(row.getAttribute('aria-posinset')) - 1;
        const place = { top: edge, bottom: edge + heightOf(index), index };
        edge = place.bottom;
        return place;
      });
    }

    /**
     * Add up the padding, the gaps, and the rendered rows: the height the list takes.
     * @returns {number} the height in pixels
     */
    function heightOfList() {
      const ul = other.element.querySelector('.task-list');
      const rows = placed();
      return rows.at(-1).bottom + parseFloat(ul.style.paddingBlockEnd);
    }

    /**
     * Scroll the list and fire the scroll event.
     * @param {number} offset the offset from the list's top
     */
    function scrollTo(offset) {
      scrolled = offset;
      document.dispatchEvent(new Event('scroll'));
    }

    /**
     * Tell whether the rendered rows cover the view, from the list's top edge down by ten rows.
     * @returns {boolean} true when the first rendered row starts above the view and the last ends below it
     */
    function coversView() {
      const rows = placed();
      return rows[0].top <= scrolled && rows.at(-1).bottom >= scrolled + 10 * ROW;
    }

    beforeEach(async () => {
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(10 * ROW);
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function height() {
        return this.classList.contains('task-row') ? heightOf(Number(this.getAttribute('aria-posinset')) - 1) : 0;
      });
      scrolled = 0;
      tallEvery = 10;
      other = createTaskList({ document, store, toaster, label: 'Tasks', hrefOf: () => '#' });
      document.body.append(other.element);
      for (const element of [other.element, other.element.querySelector('.task-list')]) {
        element.getBoundingClientRect = () => ({ top: -scrolled, bottom: 1e6 - scrolled, height: 1e6 });
      }
      other.render(many, ctx);
      await vi.waitFor(() => expect(other.element.querySelectorAll('.task-row').length).toBeGreaterThan(20));
    });

    afterEach(() => {
      other.destroy();
      vi.restoreAllMocks();
    });

    it('adds up the measured heights of the rendered rows and estimates the others at the row height (TEC-16)', () => {
      const rows = placed();
      expect(rows.map((row) => row.index)).toEqual(rows.map((_, index) => index));
      expect(rows[1].top).toBe(TALL);
      expect(rows[11].top).toBe(2 * TALL + 9 * ROW);
      expect(heightOfList()).toBe(rows.reduce((sum, row) => sum + row.bottom - row.top, 0) + (5000 - rows.length) * ROW);
    });

    it('renders the rows that cover the view after a jump into rows it has not measured', () => {
      scrollTo(2000 * ROW);
      expect(coversView()).toBe(true);
      scrollTo(3000 * ROW + 5);
      expect(coversView()).toBe(true);
      const rows = placed();
      expect(rows.length).toBeLessThan(80);
    });

    it('lays the rows out by the heights it measured when it returns to rows it saw before', () => {
      scrollTo(2000 * ROW);
      const before = placed().find((row) => row.index === 2000);
      scrollTo(0);
      scrollTo(before.top);
      expect(coversView()).toBe(true);
      expect(placed().find((row) => row.index === 2000).top).toBe(before.top);
    });

    it('keeps the rendered rows next to each other and the total height true to the heights it knows', () => {
      scrollTo(2000 * ROW);
      const rows = placed();
      const first = rows[0].index;
      const known = rows.reduce((sum, row) => sum + row.bottom - row.top, 0);
      expect(rows.map((row) => row.index)).toEqual(rows.map((_, index) => first + index));
      expect(heightOfList()).toBeGreaterThanOrEqual(known + (5000 - rows.length) * ROW);
    });

    it('measures the rows again after the window resized', () => {
      const before = heightOfList();
      tallEvery = 0;
      window.dispatchEvent(new Event('resize'));
      const rows = placed();
      expect(rows.every((row) => row.bottom - row.top === ROW)).toBe(true);
      expect(heightOfList()).toBe(5000 * ROW);
      expect(before).toBeGreaterThan(5000 * ROW);
    });

    it('gives the positions of the rows from the top, for a drag to a row that is not rendered', () => {
      const midpoints = other.midpoints();
      expect(midpoints).toHaveLength(5000);
      expect(midpoints[0]).toBe(TALL / 2);
      expect(midpoints[1]).toBe(TALL + ROW / 2);
    });
  });

  describe('with groups', () => {
    const paint = shapeTask({ id: 'g1', description: 'Buy paint', status: 'ready' });
    const door = shapeTask({ id: 'g2', description: 'Fix the door', status: 'ready' });
    const plumber = shapeTask({ id: 'g3', description: 'Call the plumber', status: 'in-progress' });

    /**
     * Read the list as text: each header as `# name count (accessible name, expanded)`, each row as its description.
     * @returns {string[]} the entries, top to bottom
     */
    function entries() {
      return [...document.querySelectorAll('.task-list > li')].map((item) => (item.classList.contains('group-header')
        ? `# ${item.querySelector('.group-header__name').textContent} ${item.querySelector('.group-header__count').textContent}`
          + ` (${item.querySelector('.group-header__toggle').getAttribute('aria-label')}, ${item.querySelector('.group-header__toggle').getAttribute('aria-expanded')})`
        : item.querySelector('.task-row__description').textContent));
    }

    it('shows the count as n of m while a filter hides tasks of a group, else the plain total', () => {
      list.render([], ctx, { groups: [
        { key: 'ready', label: 'To do', tasks: [paint, door], total: 6 },
        { key: 'in-progress', label: 'In progress', tasks: [plumber], total: 1 },
      ] });
      expect(entries()).toEqual([
        '# To do 2 of 6 (To do, 2 of 6 tasks, true)', 'Buy paint', 'Fix the door', '# In progress 1 (In progress, 1 task, true)', 'Call the plumber',
      ]);
      list.render([], ctx, { groups: [{ key: 'ready', label: 'To do', tasks: [paint, door] }] });
      expect(entries()).toEqual(['# To do 2 (To do, 2 tasks, true)', 'Buy paint', 'Fix the door']);
      const header = document.querySelector('.group-header');
      expect(header.querySelector('h3 > button.group-header__toggle')).not.toBeNull();
    });

    it('collapses and expands a group from its header, hiding only its rows', () => {
      const groups = [
        { key: 'ready', label: 'To do', tasks: [paint, door] },
        { key: 'in-progress', label: 'In progress', tasks: [plumber] },
      ];
      list.render([], ctx, { groups });
      const toggle = document.querySelector('.group-header__toggle');
      expect(toggle.type).toBe('button');
      toggle.click();
      expect(entries()).toEqual(['# To do 2 (To do, 2 tasks, false)', '# In progress 1 (In progress, 1 task, true)', 'Call the plumber']);
      expect(document.querySelector('.group-header__toggle')).toBe(toggle);
      expect([...document.querySelectorAll('.task-list > li')].map((item) => item.getAttribute('aria-setsize'))).toEqual(['3', '3', '3']);
      toggle.click();
      expect(entries()).toEqual([
        '# To do 2 (To do, 2 tasks, true)', 'Buy paint', 'Fix the door', '# In progress 1 (In progress, 1 task, true)', 'Call the plumber',
      ]);
    });

    it('keeps a group collapsed across renders, filter changes, and a group that leaves and comes back', () => {
      list.render([], ctx, { groups: [
        { key: 'ready', label: 'To do', tasks: [paint, door] },
        { key: 'in-progress', label: 'In progress', tasks: [plumber] },
      ] });
      const toggle = document.querySelector('.group-header__toggle');
      toggle.focus();
      toggle.click();
      list.render([], ctx, { groups: [
        { key: 'ready', label: 'To do', tasks: [door], total: 2 },
        { key: 'in-progress', label: 'In progress', tasks: [plumber] },
      ] });
      expect(entries()).toEqual(['# To do 1 of 2 (To do, 1 of 2 tasks, false)', '# In progress 1 (In progress, 1 task, true)', 'Call the plumber']);
      expect(document.activeElement).toBe(toggle);
      list.render([], ctx, { groups: [{ key: 'in-progress', label: 'In progress', tasks: [plumber] }] });
      list.render([], ctx, { groups: [{ key: 'ready', label: 'To do', tasks: [paint] }] });
      expect(entries()).toEqual(['# To do 1 (To do, 1 task, false)']);
      list.render([paint], ctx);
      expect(entries()).toEqual(['Buy paint']);
    });
  });

  it('moves focus to the fallback control when the last row leaves', () => {
    const fallback = document.createElement('input');
    document.body.append(fallback);
    const other = createTaskList({ document, store, toaster, label: 'Tasks', hrefOf: () => '#', fallbackFocus: () => fallback });
    document.body.append(other.element);
    other.render([tasks[1]], ctx);
    other.element.querySelector('.status-button').focus();
    other.render([], ctx);
    expect(document.activeElement).toBe(fallback);
    other.destroy();
  });

  describe('recurring tasks', () => {
    // A weekly task, ticked twice of three in the week from Monday 26 October to Monday 2 November, 00:00 in Brussels.
    const recurring = (fields = {}) => {
      const task = shapeTask({ id: 'r1', description: 'Water the plants', status: 'in-progress', 'target-count': 3, 'completion-count': 2, ...fields });
      task['lifecycle-rules'] = { ...task['lifecycle-rules'], 'due-time': null, 'overdue-handling': null, 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' };
      task['current-occurrence'] = { ...task['current-occurrence'], 'start-time': '2026-10-25T23:00:00.000Z', 'due-time': '2026-11-01T23:00:00.000Z' };
      return task;
    };
    const rowOf = () => document.querySelector('.task-row[data-task-id="r1"]');

    it('shows a connected recurring task past its period end as ready 0/3, with a repeat icon and interval instead of a due time', () => {
      list.render([recurring()], { ...ctx, now: new Date('2026-11-01T22:00:00Z') });
      expect(rowOf().dataset.status).toBe('in-progress');
      expect(rowOf().querySelector('.task-row__count').textContent).toBe('2/3');
      expect(rowOf().querySelector('.task-row__meta > .task-row__repeat').textContent).toBe('Weekly');
      expect(rowOf().querySelector('.task-row__repeat use').getAttribute('href')).toBe('img/icons.svg#repeat');
      expect(rowOf().querySelector('.task-row__due')).toBeNull();
      list.render([recurring()], { ...ctx, now: new Date('2026-11-02T08:00:00Z') });
      expect(rowOf().dataset.status).toBe('ready');
      expect(rowOf().querySelector('.task-row__count').textContent).toBe('0/3');
      expect(rowOf().querySelector('.task-row__due')).toBeNull();
    });

    it('turns a row ready 0/3 on the minute tick once its period ends', () => {
      list.render([recurring()], { ...ctx, now: new Date('2026-11-01T22:59:00Z') });
      list.tick(new Date('2026-11-01T23:00:00Z'));
      expect(rowOf().dataset.status).toBe('ready');
      expect(rowOf().querySelector('.task-row__count').textContent).toBe('0/3');
    });

    it('leaves grace completion of the previous period to the task editor, with no row menu offering it', () => {
      list.render([recurring()], { ...ctx, now: new Date('2026-11-02T08:00:00Z') });
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      rowOf().querySelector('.status-button').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(menusShowing()).toBe(0);
      expect(rowOf().querySelector('[aria-haspopup]')).toBeNull();
      expect(list.element.textContent).not.toContain('previous period');
      expect(store.postEvent).not.toHaveBeenCalled();
    });

    it('ticks a row shown ready for the new period without naming an occurrence', () => {
      list.render([recurring()], { ...ctx, now: new Date('2026-11-02T08:00:00Z') });
      rowOf().querySelector('.status-button').click();
      expect(store.postEvent).toHaveBeenCalledWith('r1', 'complete');
    });
  });
});
