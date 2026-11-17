// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createListSnapshot } from '../../src/js/core/list-snapshot.js';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore } from './store-helpers.js';

describe('createListSnapshot (TEC-16)', () => {
  let store;
  let snapshot;
  let screen;

  afterEach(() => {
    screen?.destroy();
    snapshot?.destroy();
    store?.close();
    document.body.replaceChildren();
    localStorage.clear();
  });

  /**
   * Create a store with two lists and one task in the first, and a snapshot over it.
   * @returns {Promise<void>}
   */
  async function setup() {
    ({ store } = await freshStore());
    const home = await store.createList({ name: 'Home' });
    await store.createList({ name: 'Work' });
    await store.createTask({ description: 'Dishes' }, { lists: [home.id] });
    snapshot = createListSnapshot(store);
  }

  it('reads the lists and their counts once for any number of readers until a write', async () => {
    await setup();
    const reads = vi.spyOn(store, 'listTasks');
    const [first, second] = await Promise.all([snapshot.read(), snapshot.read()]);
    await snapshot.read();
    expect(reads).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.lists.map((list) => list.name).sort()).toEqual(['Home', 'Work']);
    expect(first.counts.byList.get(first.lists.find((list) => list.name === 'Home').id)).toMatchObject({ open: 1, total: 1 });
  });

  it('reads again after a store write, so a count never shows stale', async () => {
    await setup();
    const before = await snapshot.read();
    const home = before.lists.find((list) => list.name === 'Home');
    await store.createTask({ description: 'Laundry' }, { lists: [home.id] });
    const after = await snapshot.read();
    expect(after).not.toBe(before);
    expect(after.counts.byList.get(home.id)).toMatchObject({ open: 2, total: 2 });
  });

  it('reads again after invalidate, which the clock calls for recurring tasks', async () => {
    await setup();
    const before = await snapshot.read();
    snapshot.invalidate();
    expect(await snapshot.read()).not.toBe(before);
  });

  it('does not keep a failed read', async () => {
    await setup();
    const reads = vi.spyOn(store, 'listLists').mockRejectedValueOnce(new Error('offline'));
    await expect(snapshot.read()).rejects.toThrow('offline');
    expect((await snapshot.read()).lists).toHaveLength(2);
    expect(reads).toHaveBeenCalledTimes(2);
  });

  it('lets the Lists screen render from the snapshot without reading the tasks again', async () => {
    await setup();
    await snapshot.read();
    const reads = vi.spyOn(store, 'listTasks');
    const view = document.body.appendChild(document.createElement('div'));
    screen = mountLists(view, { store, readSnapshot: snapshot.read });
    await screen.idle();
    expect(reads).not.toHaveBeenCalled();
    expect(view.querySelectorAll('.list-item')).toHaveLength(2);
    expect(view.querySelector('.list-row__counts').textContent).toMatch(/open · \d total/);
  });
});
