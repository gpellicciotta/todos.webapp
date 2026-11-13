// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachReorder } from '../../src/js/views/reorder.js';
import { createTaskList, formatDue } from '../../src/js/views/task-list.js';
import { isShowing } from './popover-shim.js';

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
    expect(isShowing(menu)).toBe(true);
    const items = [...menu.querySelectorAll('[role="menuitemradio"]')];
    expect(items.map((item) => item.textContent.trim())).toEqual(['To do', 'In progress', 'Completed', 'Cancelled']);
    expect(items[0].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(items[0]);
    items[2].click();
    expect(isShowing(menu)).toBe(false);
    expect(store.updateTask).toHaveBeenCalledWith('t2', { status: 'completed' });
  });

  it('opens the status menu from the keyboard on the status button', () => {
    const button = document.querySelectorAll('.status-button')[0];
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const menu = document.getElementById(button.getAttribute('aria-controls'));
    expect(isShowing(menu)).toBe(true);
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
    expect(isShowing(menu)).toBe(true);
    const choices = [...menu.querySelectorAll('[role="menuitem"]')];
    expect(choices.map((item) => item.textContent.trim())).toEqual(['Errands', 'Work']);
    choices[1].click();
    expect(store.addToList).toHaveBeenCalledWith('t2', 'l3');
  });

  it('styles the Delete menu item as danger and no other item', () => {
    const more = document.querySelectorAll('.task-row__more')[1];
    more.click();
    const menu = document.getElementById(more.getAttribute('aria-controls'));
    const danger = [...menu.querySelectorAll('.menu__item--danger')].map((item) => item.dataset.action);
    expect(danger).toEqual(['delete']);
  });

  it('marks each status button and status menu item with its status', () => {
    const buttons = [...document.querySelectorAll('.status-button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.dataset.status).toBe(button.closest('.task-row').dataset.status);
    }
    buttons[0].click();
    const menu = document.getElementById(buttons[0].getAttribute('aria-controls'));
    expect([...menu.querySelectorAll('[role="menuitemradio"]')].map((item) => item.dataset.status)).toEqual(['todo', 'in-progress', 'completed', 'cancelled']);
  });

  describe('by role (SHR-4, SHR-5)', () => {
    const sam = { id: 9 };
    const mine = { id: 3 };
    const shared = (role) => ({
      now: NOW, userId: 3,
      lists: new Map([['l1', { id: 'l1', name: 'Home', role, owner: sam }], ['l2', { id: 'l2', name: 'Mine', role: 'owner', owner: mine }]]),
      listsByTask: new Map([['t1', ['l1']]]),
    });
    const foreign = [{ id: 't1', description: 'Call the plumber', status: 'todo', 'due-time': null, 'owner-id': 9 }];

    /**
     * Render the foreign task for a role and tell what its row and menu offer.
     * @param {string} role the role on the list holding the task
     * @param {string|null} [listId] the list a list view shows
     * @returns {{status: HTMLButtonElement, more: HTMLButtonElement, items: () => string[]}} the row controls
     */
    function rowFor(role, listId = null) {
      list.destroy();
      list = createTaskList({ document, store, toaster, label: 'x', listId, hrefOf: (task) => `#/tasks/${task.id}` });
      document.body.replaceChildren(list.element);
      list.render(foreign, shared(role));
      const row = document.querySelector('.task-row');
      const more = row.querySelector('[data-role="more"]');
      return {
        status: row.querySelector('[data-role="status"]'),
        more,
        items: () => {
          more.click();
          return [...document.querySelectorAll('.menu:not([hidden]) .menu__item')].map((item) => item.textContent);
        },
      };
    }

    it('locks the status of a viewer and leaves them no row menu', () => {
      const row = rowFor('viewer');
      expect(row.status.disabled).toBe(true);
      expect(row.more.hidden).toBe(true);
    });

    it('lets a task editor change the status and remove the task from the list, but not delete it', () => {
      const row = rowFor('task-editor', 'l1');
      expect(row.status.disabled).toBe(false);
      expect(row.items()).toEqual(['Add to list', 'Remove from this list']);
    });

    it('offers a task editor Add to list only for the lists they may add to', () => {
      const row = rowFor('task-editor');
      expect(row.items()).toEqual(['Add to list']);
      document.querySelector('.menu:not([hidden]) [data-action="add-to-list"]').click();
      expect([...document.querySelectorAll('.menu:not([hidden]) .menu__item')].map((item) => item.textContent)).toEqual(['Mine']);
    });

    it('offers the owner of the list every action, including Delete', () => {
      const row = rowFor('owner');
      expect(row.items()).toEqual(['Add to list', 'Delete']);
    });
  });

  it('closes a reopened Add to list menu that has no list left, and focuses the More button', () => {
    const more = document.querySelectorAll('.task-row__more')[1];
    more.click();
    const menu = document.getElementById(more.getAttribute('aria-controls'));
    menu.querySelector('[data-action="add-to-list"]').click();
    list.render(tasks, { ...ctx, listsByTask: new Map([...ctx.listsByTask, ['t2', ['l1', 'l2', 'l3']]]) });
    expect(isShowing(menu)).toBe(false);
    expect(document.activeElement).toBe(document.querySelectorAll('.task-row__more')[1]);
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
    expect(isShowing(menu)).toBe(true);
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
    expect(isShowing(menu)).toBe(true);
    expect(menu.contains(document.activeElement)).toBe(true);
  });

  it('closes the menu and passes focus on when its row leaves', () => {
    document.querySelectorAll('.status-button')[1].click();
    list.render([tasks[0], tasks[2]], ctx);
    expect(isShowing(document.querySelector('.status-menu'))).toBe(false);
    expect(document.activeElement.closest('.task-row').dataset.taskId).toBe('t3');
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

  it('updates only the due chips on the clock tick, keeping rows, an open menu, and focus', () => {
    const due = { id: 't4', description: 'Pay the rent', status: 'todo', 'due-time': at(4, 10) };
    list.render([...tasks, due], ctx);
    const before = [...document.querySelectorAll('.task-row')];
    expect(before[3].querySelector('.chip').textContent).toMatch(/^Today /);
    before[3].querySelector('.status-button').click();
    const focused = document.activeElement;
    list.tick(new Date(2026, 10, 4, 10, 1));
    [...document.querySelectorAll('.task-row')].forEach((row, index) => expect(row).toBe(before[index]));
    expect(before[3].querySelector('.chip--overdue').textContent).toBe('Overdue');
    expect(isShowing(document.querySelector('.status-menu'))).toBe(true);
    expect(document.activeElement).toBe(focused);
  });

  it('renders every row of a list up to 200 tasks at once, with its place in the set', () => {
    const many = Array.from({ length: 200 }, (_, index) => ({ id: `m${index}`, description: `Task ${index}`, status: 'todo' }));
    list.render(many, ctx);
    const rows = [...document.querySelectorAll('.task-row')];
    expect(rows).toHaveLength(200);
    expect(rows.map((row) => row.getAttribute('aria-posinset'))).toEqual(many.map((_, index) => String(index + 1)));
    expect(rows.every((row) => row.getAttribute('aria-setsize') === '200')).toBe(true);
  });

  it('keeps every row of a render that changes more than 60 rows, replacing each in place', () => {
    const many = Array.from({ length: 150 }, (_, index) => ({ id: `m${index}`, description: `Task ${index}`, status: 'todo' }));
    list.render(many, ctx);
    list.render(many.map((task) => ({ ...task, status: 'completed' })), ctx);
    const rows = [...document.querySelectorAll('.task-row')];
    expect(rows).toHaveLength(150);
    expect(rows.every((row) => row.dataset.status === 'completed')).toBe(true);
  });

  describe('with a long list', () => {
    const ROW = 48;
    const many = Array.from({ length: 5000 }, (_, index) => ({ id: `m${index}`, description: `Task ${index}`, status: 'todo' }));
    let other;
    let scrolled;
    let reorder;
    let onMove;
    const step = (taskId, delta) => reorder.step(taskId, delta);

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
        document, store, toaster, label: 'Tasks', hrefOf: () => '#', moves: { enabled: () => true, step },
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

    it('keeps the focused row, its neighbors, and an open menu rendered while they scroll away', () => {
      rowOf('m5').querySelector('.status-button').click();
      const menu = other.element.querySelector('.status-menu');
      expect(isShowing(menu)).toBe(true);
      scrollTo(2000 * ROW);
      expect(shown().slice(0, 3).map((row) => row.dataset.taskId)).toEqual(['m4', 'm5', 'm6']);
      expect(shown()[3].dataset.taskId).toBe('m1980');
      expect(shown()[3].style.marginBlockStart).toBe(`${(1980 - 7) * ROW}px`);
      expect(other.element.querySelector('.task-list').style.paddingBlockStart).toBe(`${4 * ROW}px`);
      expect(isShowing(menu)).toBe(true);
      expect(menu.contains(document.activeElement)).toBe(true);
    });

    it('offers Move down on the last rendered row, and scrolls a moved row into view with focus kept', () => {
      const scroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
      const more = rowOf('m29').querySelector('.task-row__more');
      more.click();
      const menu = document.getElementById(more.getAttribute('aria-controls'));
      menu.querySelector('[data-action="move-down"]').click();
      expect(onMove).toHaveBeenCalledWith('m29', { placement: { after: 'm30' }, index: 30 });
      more.focus();
      const moved = [...many.slice(0, 29), many[30], many[29], ...many.slice(31)];
      other.render(moved, ctx);
      const row = rowOf('m29');
      expect(row.getAttribute('aria-posinset')).toBe('31');
      expect(document.activeElement).toBe(row.querySelector('.task-row__more'));
      expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
      expect(scroll.mock.contexts.at(-1)).toBe(row);
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
  });

  describe('with a long grouped list', () => {
    const ROW = 48;
    const HEADER = 32;
    const groups = Array.from({ length: 50 }, (_, group) => ({
      key: `g${group}`,
      label: `Group ${group}`,
      tasks: Array.from({ length: 100 }, (_, index) => ({ id: `m${group * 100 + index}`, description: `Task ${group * 100 + index}`, status: 'todo' })),
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
      expect(first.querySelector('h3').textContent).toBe('Group 0');
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
      expect(items.some((item) => item.classList.contains('group-header') && item.querySelector('h3').textContent === 'Group 20')).toBe(true);
      expect(items.length).toBeLessThan(80);
      expect(heightOfList()).toBe(TOTAL);
    });

    it('keeps a task of two groups as two rows with separate keys', () => {
      const dup = { id: 'dup', description: 'Shared', status: 'todo' };
      other.render([], ctx, { groups: [
        { key: 'a', label: 'A', tasks: [dup] }, { key: 'b', label: 'B', tasks: [dup] },
      ] });
      const rows = [...other.element.querySelectorAll('.task-row')];
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((row) => row.dataset.rowKey)).size).toBe(2);
      expect(other.ids()).toEqual(['dup', 'dup']);
    });

    it('marks every row of the selected task and keeps focus on the same group row after a render', () => {
      const dup = { id: 'dup', description: 'Shared', status: 'todo' };
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
      const dup = { id: 'dup', description: 'Shared', status: 'todo' };
      const next = { id: 'next', description: 'Next', status: 'todo' };
      other.render([], ctx, { groups: [{ key: 'a', label: 'A', tasks: [dup] }, { key: 'b', label: 'B', tasks: [next] }] });
      other.element.querySelector('.task-row').querySelector('.status-button').focus();
      other.render([], ctx, { groups: [{ key: 'b', label: 'B', tasks: [next] }] });
      expect(document.activeElement.closest('.task-row').dataset.taskId).toBe('next');
    });
  });

  describe('with a long list of rows taller than 48 px', () => {
    const ROW = 48;
    const TALL = 96;
    const many = Array.from({ length: 5000 }, (_, index) => ({ id: `m${index}`, description: `Task ${index}`, status: 'todo' }));
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
