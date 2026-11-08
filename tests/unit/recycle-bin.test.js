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
    emptyBin: vi.fn(async () => {
      const purged = bin.map(({ type, id }) => ({ type, id }));
      bin = [];
      listeners.forEach((listener) => listener({ operation: 'emptyBin', remote: false }));
      return purged;
    }),
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

  it('counts the days left to the exact purge time, which a daylight saving change moves to another date', () => {
    // 30 times 24 hours after 00:30 summer time is 23:30 winter time on the day before.
    const deleted = new Date(2026, 9, 6, 0, 30);
    const purged = new Date(2026, 10, 4, 23, 30).toISOString();
    expect(describeDeletion(entry(deleted, { 'purge-time': purged }), now)).toBe('Deleted 29 days ago · last day');
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
    expect(row().querySelector('[data-role="purge"]').classList.contains('button--danger')).toBe(true);
    expect(row().querySelector('[data-role="restore"]').classList.contains('button--danger')).toBe(false);
    row().querySelector('[data-role="purge"]').click();
    const group = row().querySelector('.inline-confirm');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.textContent).toContain('Delete forever?');
    expect(group.querySelector('[data-role="confirm"]').classList.contains('button--danger')).toBe(true);
    expect(group.querySelector('[data-role="keep"]').classList.contains('button--danger')).toBe(false);
    expect(document.activeElement.textContent).toBe('Keep');
    document.activeElement.click();
    expect(row().querySelector('.inline-confirm')).toBeNull();
    expect(document.activeElement).toBe(row().querySelector('[data-role="purge"]'));
    row().querySelector('[data-role="purge"]').click();
    row().querySelector('.inline-confirm').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(row().querySelector('.inline-confirm')).toBeNull();
    expect(store.purgeForever).not.toHaveBeenCalled();
  });

  it('keeps the in-row question and focus when deleting for good fails', async () => {
    const { store, toaster } = await mount([entry(new Date())]);
    store.purgeForever.mockRejectedValueOnce(new Error('disk full'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.querySelector('[data-role="purge"]').click();
    document.querySelector('[data-role="confirm"]').focus();
    document.querySelector('[data-role="confirm"]').click();
    await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledWith('"Buy new curtains" could not be deleted.'));
    error.mockRestore();
    expect(document.activeElement).toBe(document.querySelector('[data-role="confirm"]'));
    document.querySelector('[data-role="keep"]').click();
    expect(document.querySelector('.inline-confirm')).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('[data-role="purge"]'));
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

  describe('Empty recycle bin', () => {
    const empty = () => document.querySelector('[data-role="empty-bin"]');
    const question = () => document.querySelector('.bin__confirm');

    it('hides the button while the bin is empty', async () => {
      await mount([]);
      expect(empty().hidden).toBe(true);
    });

    it('asks with the count before emptying, and Keep leaves the bin as it was', async () => {
      const { store } = await mount([
        entry(new Date(), { id: 't1' }), entry(new Date(), { id: 't2' }),
        entry(new Date(), { type: 'list', id: 'l1', name: 'Garden', description: undefined }),
      ]);
      expect(empty().hidden).toBe(false);
      empty().click();
      expect(question().textContent).toContain('Permanently delete 1 list and 2 tasks? This cannot be undone.');
      expect(question().getAttribute('role')).toBe('group');
      expect(document.activeElement.textContent).toBe('Keep');
      document.activeElement.click();
      expect(question()).toBeNull();
      expect(document.activeElement).toBe(empty());
      empty().click();
      question().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(question()).toBeNull();
      expect(store.emptyBin).not.toHaveBeenCalled();
    });

    it('empties the bin after Delete all, shows the empty text, and toasts', async () => {
      const { store, toaster } = await mount([entry(new Date())]);
      empty().click();
      [...question().querySelectorAll('button')].find((button) => button.textContent === 'Delete all').click();
      await vi.waitFor(() => expect(document.querySelector('.bin-row')).toBeNull());
      expect(store.emptyBin).toHaveBeenCalledTimes(1);
      expect(toaster.show).toHaveBeenCalledWith('Recycle bin emptied.');
      expect(document.activeElement).toBe(document.querySelector('.empty-state__title'));
      expect(document.querySelector('.empty-state').hidden).toBe(false);
      expect(empty().hidden).toBe(true);
      expect(question()).toBeNull();
    });

    it('describes the question by its count text, and ignores a second click while emptying', async () => {
      const { store } = await mount([entry(new Date())]);
      let release;
      store.emptyBin.mockImplementationOnce(() => new Promise((resolve) => {
        release = resolve;
      }));
      empty().click();
      expect(document.getElementById(question().getAttribute('aria-describedby')).textContent).toContain('Permanently delete 1 task');
      const confirm = question().querySelector('[data-role="confirm-all"]');
      confirm.click();
      confirm.click();
      release([]);
      await vi.waitFor(() => expect(store.emptyBin).toHaveBeenCalledTimes(1));
    });

    it('keeps the screen and the question and shows a toast when emptying fails', async () => {
      const { store, toaster } = await mount([entry(new Date())]);
      store.emptyBin.mockRejectedValueOnce(new Error('disk full'));
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      empty().click();
      [...question().querySelectorAll('button')].find((button) => button.textContent === 'Delete all').click();
      await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledWith('The recycle bin could not be emptied.'));
      error.mockRestore();
      expect(document.querySelectorAll('.bin-row')).toHaveLength(1);
      expect(question()).not.toBeNull();
    });
  });
});
