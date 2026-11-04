// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTaskList, formatDue } from '../../src/js/views/task-list.js';

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

describe('formatDue', () => {
  it('shows a relative time, and Overdue for open tasks past their due time (OVD-2)', () => {
    expect(formatDue({ 'due-time': null, status: 'todo' }, NOW, 'en-GB')).toBeNull();
    expect(formatDue({ 'due-time': at(4, 8), status: 'todo' }, NOW, 'en-GB')).toEqual({ text: 'Overdue', overdue: true });
    expect(formatDue({ 'due-time': at(4, 8), status: 'completed' }, NOW, 'en-GB')).toEqual({ text: 'Today 08:00', overdue: false });
    expect(formatDue({ 'due-time': at(4, 18), status: 'todo' }, NOW, 'en-GB')).toEqual({ text: 'Today 18:00', overdue: false });
    expect(formatDue({ 'due-time': at(5, 18), status: 'todo' }, NOW, 'en-GB').text).toBe('Tomorrow 18:00');
    expect(formatDue({ 'due-time': at(5, 23, 59), status: 'todo' }, NOW, 'en-GB').text).toBe('Tomorrow');
    expect(formatDue({ 'due-time': at(9, 10), status: 'todo' }, NOW, 'en-GB').text).toBe('Mon 10:00');
    expect(formatDue({ 'due-time': at(12, 23, 59), status: 'todo' }, NOW, 'en-GB').text).toBe('12 Nov');
    expect(formatDue({ 'due-time': new Date(2027, 0, 3, 23, 59).toISOString(), status: 'todo' }, NOW, 'en-GB').text).toBe('3 Jan 2027');
  });
});

describe('createTaskList', () => {
  let store;
  let toaster;
  let list;
  const tasks = [
    { id: 't1', description: 'Call the plumber', status: 'in-progress', 'due-time': at(3, 10) },
    { id: 't2', description: 'Buy paint', status: 'todo', 'due-time': null },
    { id: 't3', description: 'Water the plants', status: 'completed', 'due-time': null },
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

  it('renders one row per task with its status, link, due chip, list chips, and note count', () => {
    const rows = [...document.querySelectorAll('.task-row')];
    expect(rows.map((row) => row.dataset.status)).toEqual(['in-progress', 'todo', 'completed']);
    const first = rows[0];
    expect(first.querySelector('.status-button').getAttribute('aria-label')).toBe('Status of Call the plumber: In progress');
    expect(first.querySelector('.status-button use').getAttribute('href')).toBe('img/icons.svg#status-in-progress');
    expect(first.querySelector('.task-row__open').getAttribute('href')).toBe('#/tasks/t1');
    expect(first.querySelector('.chip--overdue').textContent).toBe('Overdue');
    expect([...first.querySelectorAll('.task-row__list')].map((chip) => chip.textContent)).toEqual(['Home', 'Errands']);
    expect(first.querySelector('.task-row__more-lists').textContent).toBe('+1 more lists');
    expect(first.querySelector('.task-row__notes').textContent).toBe('2 notes');
    expect(rows[2].querySelector('.chip')).toBeNull();
    expect(document.querySelector('.task-list').getAttribute('aria-label')).toBe('All tasks');
  });

  it('marks the selected task with aria-current', () => {
    list.setSelected('t2');
    expect(document.querySelector('[aria-current="page"]').getAttribute('href')).toBe('#/tasks/t2');
    list.setSelected(null);
    expect(document.querySelector('[aria-current]')).toBeNull();
  });

  it('opens the status menu with the current status checked, and sets the picked status (TSK-4)', () => {
    const button = document.querySelectorAll('.status-button')[1];
    button.click();
    const menu = document.getElementById(button.getAttribute('aria-controls'));
    expect(menu.hidden).toBe(false);
    const items = [...menu.querySelectorAll('[role="menuitemradio"]')];
    expect(items.map((item) => item.textContent.trim())).toEqual(['To do', 'In progress', 'Completed', 'Cancelled']);
    expect(items[0].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(items[0]);
    items[2].click();
    expect(menu.hidden).toBe(true);
    expect(store.updateTask).toHaveBeenCalledWith('t2', { status: 'completed' });
  });

  it('opens the status menu from the keyboard on the status button', () => {
    const button = document.querySelectorAll('.status-button')[0];
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const menu = document.getElementById(button.getAttribute('aria-controls'));
    expect(menu.hidden).toBe(false);
    expect(document.activeElement.textContent.trim()).toBe('In progress');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(store.updateTask).toHaveBeenCalledWith('t1', { status: 'completed' });
  });

  it('offers Add to list and Delete in the More menu, without Set status', async () => {
    const more = document.querySelectorAll('.task-row__more')[1];
    more.click();
    const menu = document.getElementById(more.getAttribute('aria-controls'));
    expect([...menu.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent.trim())).toEqual(['Add to list', 'Delete']);
    menu.querySelector('[data-action="add-to-list"]').click();
    expect(menu.hidden).toBe(false);
    const choices = [...menu.querySelectorAll('[role="menuitem"]')];
    expect(choices.map((item) => item.textContent.trim())).toEqual(['Errands', 'Work']);
    choices[1].click();
    expect(store.addToList).toHaveBeenCalledWith('t2', 'l3');
  });

  it('moves a task to the recycle bin with an Undo toast (TSK-11)', async () => {
    const more = document.querySelectorAll('.task-row__more')[0];
    more.click();
    document.getElementById(more.getAttribute('aria-controls')).querySelector('[data-action="delete"]').click();
    await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(1));
    expect(store.deleteTask).toHaveBeenCalledWith('t1');
    const [message, settings] = toaster.show.mock.lastCall;
    expect(message).toBe('Task moved to the recycle bin.');
    expect(settings.undo).toBe(true);
    settings.onAction();
    expect(store.restoreTask).toHaveBeenCalledWith('t1');
  });

  it('keeps focus on the same control when rows render again', () => {
    document.querySelectorAll('.status-button')[1].focus();
    list.render([...tasks].reverse(), ctx);
    expect(document.activeElement.closest('.task-row').dataset.taskId).toBe('t2');
    expect(document.activeElement.classList.contains('status-button')).toBe(true);
  });

  it('keeps an open status menu open, on the same item, when rows render again', () => {
    document.querySelectorAll('.status-button')[1].click();
    const menu = document.querySelector('.status-menu');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    list.render([...tasks].reverse(), ctx);
    expect(menu.hidden).toBe(false);
    expect(document.activeElement.dataset.status).toBe('in-progress');
    const trigger = [...document.querySelectorAll('.task-row')].find((row) => row.dataset.taskId === 't2').querySelector('.status-button');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    document.activeElement.click();
    expect(store.updateTask).toHaveBeenCalledWith('t2', { status: 'in-progress' });
  });

  it('keeps an open More menu open when rows render again', () => {
    document.querySelectorAll('.task-row__more')[0].click();
    list.render(tasks, ctx);
    const menu = document.querySelectorAll('.task-list-frame .menu')[1];
    expect(menu.hidden).toBe(false);
    expect(menu.contains(document.activeElement)).toBe(true);
  });

  it('closes the menu and passes focus on when its row leaves', () => {
    document.querySelectorAll('.status-button')[1].click();
    list.render([tasks[0], tasks[2]], ctx);
    expect(document.querySelector('.status-menu').hidden).toBe(true);
    expect(document.activeElement.closest('.task-row').dataset.taskId).toBe('t3');
  });

  it('moves focus to the fallback control when the last row leaves', () => {
    const fallback = document.createElement('input');
    document.body.append(fallback);
    const other = createTaskList({ document, store, toaster, label: 'Tasks', hrefOf: () => '#', fallbackFocus: () => fallback });
    document.body.append(other.element);
    other.render([tasks[1]], ctx);
    other.element.querySelector('.task-row__more').focus();
    other.render([], ctx);
    expect(document.activeElement).toBe(fallback);
    other.destroy();
  });
});
