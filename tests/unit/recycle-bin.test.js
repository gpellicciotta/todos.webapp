// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeDeletion, mountRecycleBin } from '../../src/js/views/recycle-bin.js';

/**
 * Return a bin entry deleted at a local time.
 * @param {Date} deleted the deletion time
 * @param {object} [fields] more fields
 * @returns {object} the entry
 */
function entry(deleted, fields = {}) {
  return {
    type: 'task', id: 't1', description: 'Buy new curtains', 'deletion-time': deleted.toISOString(),
    'purge-time': new Date(deleted.getTime() + 30 * 86_400_000).toISOString(), ...fields,
  };
}

/**
 * Create a store stand-in whose bin holds the given entries.
 * @param {object[]} entries the bin entries
 * @returns {object} the store
 */
function fakeStore(entries) {
  let bin = [...entries];
  const listeners = new Set();
  const drop = (id) => {
    bin = bin.filter((candidate) => candidate.id !== id);
    listeners.forEach((listener) => listener({ operation: 'bin', remote: false }));
  };
  return {
    listBin: async () => bin,
    restoreTask: vi.fn(async (id) => drop(id)),
    restoreList: vi.fn(async (id) => drop(id)),
    purgeForever: vi.fn(async (type, id) => drop(id)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

describe('describeDeletion', () => {
  const now = new Date(2026, 10, 4, 10, 0);

  it('counts calendar days in the device timezone', () => {
    expect(describeDeletion(entry(new Date(2026, 10, 4, 8, 0)), now)).toBe('Deleted today · 30 days left');
    expect(describeDeletion(entry(new Date(2026, 10, 3, 23, 0)), now)).toBe('Deleted yesterday · 29 days left');
    expect(describeDeletion(entry(new Date(2026, 9, 30, 12, 0)), now)).toBe('Deleted 5 days ago · 25 days left');
    expect(describeDeletion(entry(new Date(2026, 9, 6, 12, 0)), now)).toBe('Deleted 29 days ago · 1 day left');
    expect(describeDeletion(entry(new Date(2026, 9, 5, 23, 0)), now)).toBe('Deleted 30 days ago · last day');
  });
});

describe('mountRecycleBin', () => {
  let screen;

  afterEach(() => {
    screen?.destroy();
  });

  /**
   * Mount the screen on a store stand-in.
   * @param {object[]} entries the bin entries
   * @returns {Promise<{store: object, toaster: {show: Function}, navigate: Function}>} the parts
   */
  async function mount(entries) {
    document.body.innerHTML = '<div data-view="bin"></div>';
    const store = fakeStore(entries);
    const toaster = { show: vi.fn() };
    const navigate = vi.fn();
    screen = mountRecycleBin(document.querySelector('[data-view]'), { store, toaster, navigate, now: () => new Date() });
    await screen.idle();
    return { store, toaster, navigate };
  }

  it('renders the rows again on the minute tick only once the local date changed', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let time = new Date(2026, 10, 4, 23, 58);
      document.body.innerHTML = '<div data-view="bin"></div>';
      screen = mountRecycleBin(document.querySelector('[data-view]'), {
        store: fakeStore([entry(new Date(2026, 10, 4, 8, 0))]), toaster: { show: vi.fn() }, navigate: vi.fn(), now: () => time,
      });
      await screen.idle();
      const row = document.querySelector('.bin-row');
      time = new Date(2026, 10, 4, 23, 59);
      vi.advanceTimersByTime(60_000);
      expect(document.querySelector('.bin-row')).toBe(row);
      time = new Date(2026, 10, 5, 0, 0);
      vi.advanceTimersByTime(60_000);
      expect(document.querySelector('.bin-row')).not.toBe(row);
      expect(document.querySelector('.bin-row__meta').textContent).toBe('Deleted yesterday · 29 days left');
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('asks in the row before deleting, and Keep or Escape leave the entry', async () => {
    const { store } = await mount([entry(new Date())]);
    // Rows render again on every change, so each step looks the row up again.
    const row = () => document.querySelector('.bin-row');
    row().querySelector('[data-role="purge"]').click();
    const group = row().querySelector('.inline-confirm');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.textContent).toContain('Delete forever?');
    expect(document.activeElement.textContent).toBe('Keep');
    document.activeElement.click();
    expect(row().querySelector('.inline-confirm')).toBeNull();
    expect(document.activeElement).toBe(row().querySelector('[data-role="purge"]'));
    row().querySelector('[data-role="purge"]').click();
    row().querySelector('.inline-confirm').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(row().querySelector('.inline-confirm')).toBeNull();
    expect(store.purgeForever).not.toHaveBeenCalled();
  });

  it('deletes for good after Delete, and shows the empty bin text', async () => {
    const { store } = await mount([entry(new Date())]);
    document.querySelector('[data-role="purge"]').click();
    [...document.querySelectorAll('.inline-confirm button')].find((button) => button.textContent === 'Delete').click();
    await vi.waitFor(() => expect(document.querySelector('.bin-row')).toBeNull());
    expect(store.purgeForever).toHaveBeenCalledWith('task', 't1');
    expect(document.querySelector('.empty-state').hidden).toBe(false);
    expect(document.querySelector('.empty-state').textContent).toContain('Deleted items stay here for 30 days.');
  });

  it('restores a list and shows a toast whose action opens it', async () => {
    const { store, toaster, navigate } = await mount([entry(new Date(), { type: 'list', id: 'l1', name: 'Garden', description: undefined })]);
    document.querySelector('[data-role="restore"]').click();
    await vi.waitFor(() => expect(toaster.show).toHaveBeenCalled());
    expect(store.restoreList).toHaveBeenCalledWith('l1');
    const [message, settings] = toaster.show.mock.calls[0];
    expect(message).toBe('Restored "Garden".');
    expect(settings.actionLabel).toBe('Open');
    settings.onAction();
    expect(navigate).toHaveBeenCalledWith('#/lists/l1');
  });
});
