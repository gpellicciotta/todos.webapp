import { describe, expect, it } from 'vitest';
import { LOG_DAYS } from '../../src/js/sync/sync-log.js';
import { freshStore } from './store-helpers.js';

const DAY = 24 * 60 * 60 * 1000;

describe('the sync log', () => {
  it('keeps entries for 30 days', () => {
    expect(LOG_DAYS).toBe(30);
  });

  it('purges entries older than 30 days and keeps newer ones', async () => {
    const { store, clock } = await freshStore();
    await store.queue.appendLog([{ kind: 'overwritten', target: { type: 'task', id: 't1' }, field: 'status', sent: 'todo', kept: 'completed' }]);
    clock.tick(20 * DAY);
    await store.queue.appendLog([{ kind: 'error', message: 'The service failed.' }]);
    clock.tick(11 * DAY);
    expect(await store.queue.purgeLog()).toBe(1);
    expect((await store.queue.log()).map((record) => record.kind)).toEqual(['error']);
    clock.tick(30 * DAY);
    expect(await store.queue.purgeLog()).toBe(1);
    expect(await store.queue.log()).toEqual([]);
  });

  it('keeps an entry that is exactly 30 days old', async () => {
    const { store, clock } = await freshStore();
    await store.queue.appendLog([{ kind: 'error', message: 'Edge' }]);
    clock.tick(30 * DAY);
    expect(await store.queue.purgeLog()).toBe(0);
  });

  it('stores lost access and error records next to overwritten and rejected ones', async () => {
    const { store } = await freshStore();
    await store.queue.appendLog([
      { kind: 'lost-access', target: { type: 'list', id: 'l1' }, name: 'Garden', undone: 2, message: 'You no longer have access to Garden. 2 changes were undone.' },
      { kind: 'error', message: 'The service failed.' },
    ]);
    const records = await store.queue.log();
    expect(records.map((record) => record.kind)).toEqual(['lost-access', 'error']);
    expect(records.every((record) => typeof record.id === 'string' && typeof record.time === 'string')).toBe(true);
  });
});
