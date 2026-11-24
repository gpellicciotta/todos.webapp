// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSeenMarker, mountSyncLog } from '../../src/js/views/sync-log.js';
import { freshStore } from './store-helpers.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Create an in-memory storage stand-in.
 * @returns {Storage} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/**
 * Mount the screen over a fresh store.
 * @returns {Promise<object>} the parts
 */
async function mount() {
  const { store, clock } = await freshStore();
  const storage = memoryStorage();
  const seen = createSeenMarker({ getStorage: () => storage, now: () => new Date(clock.now) });
  const view = document.body.appendChild(document.createElement('div'));
  const screen = mountSyncLog(view, { store, seen, now: () => new Date(clock.now) });
  return { store, clock, seen, view, screen };
}

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('the Sync log screen', () => {
  it('says so when nothing was overwritten or refused', async () => {
    const { view, screen } = await mount();
    await screen.idle();
    expect(view.querySelector('.sync-log__empty').textContent).toContain('Nothing');
    expect(view.querySelectorAll('.entry-list__item')).toHaveLength(0);
    expect(view.textContent).toContain('Entries stay for 30 days.');
  });

  it('lists entries newest first, each with its kind', async () => {
    const { store, clock, view, screen } = await mount();
    await store.queue.appendLog([{ kind: 'error', message: 'Syncing failed. It will try again.', detail: 'Server unavailable' }]);
    clock.tick(1000);
    await store.queue.appendLog([{ kind: 'lost-access', target: { type: 'list', id: 'l1' }, name: 'Groceries', undone: 2, message: 'You no longer have access to Groceries. 2 changes were undone.' }]);
    clock.tick(1000);
    await store.queue.appendLog([{ kind: 'rejected', operation: 'update-task', target: { type: 'task', id: 't1' }, fields: { status: 'completed' }, status: 403, message: 'The service refused a task change, so it was undone.' }]);
    clock.tick(1000);
    await store.queue.appendLog([{ kind: 'overwritten', target: { type: 'rules', id: 't2' }, field: 'due-time', sent: '2026-11-06T10:00:00Z', kept: '2026-11-07T18:00:00Z' }]);
    await screen.update();
    const list = view.querySelector('ul.entry-list');
    expect(list.getAttribute('role')).toBe('list');
    expect(list.getAttribute('aria-label')).toBe('Sync log entries');
    const cards = [...list.children];
    expect(cards.every((card) => card.matches('li.entry-list__item'))).toBe(true);
    expect(cards.map((card) => card.dataset.kind)).toEqual(['overwritten', 'rejected', 'lost-access', 'error']);
    const chips = cards.map((card) => card.querySelector('.entry-list__meta .chip--status'));
    expect(chips.map((chip) => chip.textContent)).toEqual(['Overwritten value', 'Rejected change', 'Lost access', 'Sync error']);
    expect(chips.map((chip) => chip.dataset.severity)).toEqual(['warning', 'error', 'error', 'error']);
  });

  it('shows the message first, then a chip row led by a time chip with the clock icon', async () => {
    const { store, view, screen } = await mount();
    await store.queue.appendLog([{ kind: 'error', message: 'Syncing failed. It will try again.', detail: 'Server unavailable' }]);
    await screen.update();
    const card = view.querySelector('.entry-list__item');
    const [message, meta, details] = card.children;
    expect(message.matches('p.entry-list__message')).toBe(true);
    expect(message.textContent).toBe('Syncing failed. It will try again.');
    expect(meta.matches('div.entry-list__meta')).toBe(true);
    const timeChip = meta.firstElementChild;
    expect(timeChip.matches('span.chip')).toBe(true);
    expect(timeChip.querySelector('svg.icon use').getAttribute('href')).toContain('icon-clock');
    const time = timeChip.querySelector('time');
    expect(time.textContent).toMatch(/^Today /u);
    expect(Number.isNaN(new Date(time.getAttribute('datetime')).getTime())).toBe(false);
    expect(details.matches('.entry-list__details')).toBe(true);
    expect(details.textContent).toBe('Server unavailable');
  });

  it('names and links the task of a rule edit and of an adopted event (SYN-8, SYN-9)', async () => {
    const { store, clock, view, screen } = await mount();
    const task = await store.createTask({ description: 'Water the plants' });
    await store.queue.appendLog([{ kind: 'overwritten', target: { type: 'rules', id: task.id }, field: 'due-time', sent: '2026-11-06T10:00:00Z', kept: '2026-11-07T18:00:00Z' }]);
    clock.tick(1000);
    await store.queue.appendLog([{ kind: 'rejected', operation: 'adopt-event', target: { type: 'event', id: 'e1', 'task-id': task.id }, status: 409, message: 'The service refused a local row, which stays on this device.' }]);
    await screen.update();
    const items = [...view.querySelectorAll('.entry-list__item')].map((entry) => [entry.querySelector('.entry-list__message').textContent.split(' · ')[0], entry.querySelector('.entry-list__action a')?.getAttribute('href')]);
    expect(items).toEqual([['Water the plants', `#/tasks/${task.id}`], ['Water the plants', `#/tasks/${task.id}`]]);
  });

  it('shows the item, the field, the lost value, and the kept value of an overwritten value', async () => {
    const { store, view, screen } = await mount();
    const task = await store.createTask({ description: 'Buy paint' });
    await store.queue.appendLog([{ kind: 'overwritten', target: { type: 'task', id: task.id }, field: 'description', sent: 'Buy primer', kept: 'Buy paint' }]);
    await screen.update();
    const entry = view.querySelector('.entry-list__item');
    expect(entry.querySelector('.entry-list__message').textContent).toBe('Buy paint · Description');
    expect(entry.querySelector('.entry-list__details').textContent).toBe('Lost: Buy primer · Kept: Buy paint');
    const meta = entry.querySelector('.entry-list__meta');
    const link = meta.lastElementChild.querySelector('a');
    expect(meta.lastElementChild.matches('.entry-list__action')).toBe(true);
    expect(link.textContent).toBe('Open');
    expect(link.getAttribute('aria-label')).toBe('Open Buy paint');
    expect(link.getAttribute('href')).toBe(`#/tasks/${task.id}`);
  });

  it('names the reason and the undone change of a rejected change', async () => {
    const { store, view, screen } = await mount();
    await store.queue.appendLog([{ kind: 'rejected', operation: 'update-task', target: { type: 'task', id: 'gone' }, fields: { status: 'completed' }, status: 403, message: 'The service refused a task change, so it was undone.' }]);
    await screen.update();
    const entry = view.querySelector('.entry-list__item');
    expect(entry.querySelector('.entry-list__message').textContent).toContain('The service refused a task change, so it was undone.');
    expect(entry.querySelector('.entry-list__details').textContent).toBe('Undone: status: completed');
    expect(entry.querySelector('a')).toBeNull();
    expect(entry.querySelector('.entry-list__action')).toBeNull();
  });

  it('links a list while it exists and not after', async () => {
    const { store, view, screen } = await mount();
    const list = await store.createList({ name: 'Home' });
    await store.queue.appendLog([{ kind: 'lost-access', target: { type: 'list', id: list.id }, name: 'Home', undone: 1, message: 'You no longer have access to Home. 1 change was undone.' }]);
    await screen.update();
    expect(view.querySelector('.entry-list__item .entry-list__action a').getAttribute('href')).toBe(`#/lists/${list.id}`);
  });

  it('leaves out entries older than 30 days', async () => {
    const { store, clock, view, screen } = await mount();
    await store.queue.appendLog([{ kind: 'error', message: 'Old failure' }]);
    clock.tick(31 * DAY);
    await store.queue.appendLog([{ kind: 'error', message: 'New failure' }]);
    await screen.update();
    expect(view.textContent).toContain('New failure');
    expect(view.textContent).not.toContain('Old failure');
  });

  it('marks the log seen when opened and again when it changes while open', async () => {
    const { store, clock, seen, screen } = await mount();
    await screen.idle();
    expect(new Date(seen.get()).getTime()).toBe(clock.now);
    await store.queue.appendLog([{ kind: 'error', message: 'Failure' }]);
    clock.tick(1000);
    await screen.update();
    expect(new Date(seen.get()).getTime()).toBe(clock.now);
  });

  it('renders values as text only', async () => {
    const { store, view, screen } = await mount();
    await store.queue.appendLog([{ kind: 'overwritten', target: { type: 'task', id: 'x' }, field: 'description', sent: '<img src=x onerror=alert(1)>', kept: 'ok' }]);
    await screen.update();
    expect(view.querySelector('img')).toBeNull();
    expect(view.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('the seen marker', () => {
  it('starts empty, remembers a mark, and tells its listeners', () => {
    const storage = memoryStorage();
    const seen = createSeenMarker({ getStorage: () => storage, now: () => new Date(Date.UTC(2026, 10, 7, 9)) });
    const heard = [];
    seen.subscribe((time) => heard.push(time));
    expect(seen.get()).toBeNull();
    seen.mark();
    expect(seen.get()).toBe('2026-11-07T09:00:00.000Z');
    expect(heard).toEqual(['2026-11-07T09:00:00.000Z']);
    expect(createSeenMarker({ getStorage: () => storage }).get()).toBe('2026-11-07T09:00:00.000Z');
  });
});
