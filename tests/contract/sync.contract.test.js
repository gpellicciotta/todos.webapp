import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportBackup, importBackup } from '../../src/js/core/backup.js';
import { removePreference, writePreference, writeServerUrl } from '../../src/js/core/preferences.js';
import { createApi } from '../../src/js/sync/api.js';
import { createEngine } from '../../src/js/sync/engine.js';
import { createPushSubscription } from '../../src/js/sync/push-subscription.js';
import { createSession } from '../../src/js/sync/session.js';
import { createSettingsSync } from '../../src/js/sync/settings.js';
import { freshStore } from '../unit/store-helpers.js';
import { serverDir, startStack, vapidKeys } from './server.js';

/**
 * Contract tests: the sync client against a real todos server on an in-memory database.
 * They run only when `TODOS_SERVER_DIR` names a todos checkout: `TODOS_SERVER_DIR=../todos npm run test:contract`.
 * Mocked REST tests (tests/unit) cannot see the server change; these show protocol drift before a release.
 */

const DIR = serverDir();
const ACCOUNTS = [
  { code: 'code-ada', id: 101, name: 'Ada', email: 'ada@example.com' },
  { code: 'code-root', id: 102, name: 'Root', email: 'root@example.com', admin: true },
];
let channelCount = 0;

/**
 * Keep a storage in memory, like `localStorage`.
 * @returns {Storage} the storage
 */
function memoryStorage() {
  const items = new Map();
  return {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

describe.skipIf(!DIR)('the sync client against a real todos server', () => {
  let stack;

  beforeAll(async () => {
    stack = await startStack({ dir: DIR, accounts: ACCOUNTS });
  });

  afterAll(async () => {
    await stack?.stop();
  });

  /**
   * Count every request, and record the responses of the feed, so a test can see a `410`.
   * @returns {Function & {statuses: number[], count: number}} the fetch
   */
  function recordingFetch() {
    const record = async (url, init) => {
      record.count += 1;
      const response = await fetch(url, init);
      if (new URL(url).pathname === '/api/changes') {
        record.statuses.push(response.status);
      }
      return response;
    };
    record.statuses = [];
    record.count = 0;
    return record;
  }

  /**
   * Open a device that signed in as an account, through the real Auth routes of the server.
   * @param {string} code the authorization code the Auth stand-in grants
   * @param {{version?: string, localData?: (store: object) => Promise<void>}} [options] a client version, and local data to adopt
   * @returns {Promise<object>} the device: `store`, `clock`, `session`, `engine`, `fetch`, and `raw` for direct calls
   */
  async function device(code, { version, localData } = {}) {
    const { store, clock } = await freshStore({ tracking: () => true });
    clock.now = Date.now() - 3_600_000;
    await localData?.(store);
    const storage = memoryStorage();
    writeServerUrl(stack.url, () => storage);
    const fetchRecorded = recordingFetch();
    const session = createSession({ getStorage: () => storage, fetch: fetchRecorded });
    const started = new URL(session.start({ returnUrl: 'http://127.0.0.1/' }));
    await session.complete(code, started.searchParams.get('app-state'));
    const api = createApi({ session, fetch: fetchRecorded, ...(version ? { version } : {}) });
    const engine = createEngine({ store, session, fetch: fetchRecorded, api, locks: null, win: null, doc: null, channelName: `contract-${channelCount++}` });
    const raw = (method, path, headers = {}) => fetch(`${stack.url}${path}`, { method, headers: { Authorization: `Bearer ${session.token()}`, ...headers } });
    return { store, clock, session, engine, fetch: fetchRecorded, raw };
  }

  /**
   * Read what the server holds for a device's account.
   * @param {object} who the device
   * @returns {Promise<{lists: object[], tasks: object[], memberships: object[], notes: object[]}>} the snapshot
   */
  async function serverState(who) {
    const response = await who.raw('GET', '/api/changes?page-size=1000', { Accept: 'application/json' });
    expect(response.status).toBe(200);
    return response.json();
  }

  it('signs in through the Auth routes of the server', async () => {
    const ada = await device('code-ada');
    expect(ada.session.state()).toBe('connected');
    expect(ada.session.account()).toMatchObject({ email: 'ada@example.com', server: stack.url });
  });

  it('registers a push subscription, reads it back, changes its lead time, and deletes it', async () => {
    const ada = await device('code-ada');
    const endpoint = 'https://fcm.googleapis.com/fcm/send/contract-test';
    const subscription = {
      endpoint,
      toJSON: () => ({ endpoint, keys: { p256dh: vapidKeys().publicKey, auth: Buffer.alloc(16, 7).toString('base64url') } }),
      unsubscribe: async () => true,
    };
    const manager = { getSubscription: async () => null, subscribe: async () => subscription };
    const state = { lead: 15 };
    const storage = memoryStorage();
    const push = createPushSubscription({
      session: ada.session,
      api: createApi({ session: ada.session }),
      getRegistration: async () => ({ pushManager: manager }),
      wanted: () => true,
      lead: () => state.lead,
      getStorage: () => storage,
      deviceName: () => 'Contract test',
    });
    const held = async () => (await (await ada.raw('GET', '/api/push-subscriptions', { Accept: 'application/json' })).json());
    expect(await push.sync()).toBe('on');
    expect(await held()).toEqual([expect.objectContaining({ endpoint, 'lead-minutes': 15, 'device-name': 'Contract test' })]);
    state.lead = 60;
    expect(await push.sync()).toBe('on');
    expect(await held()).toEqual([expect.objectContaining({ 'lead-minutes': 60 })]);
    await push.unregister();
    expect(await held()).toEqual([]);
  });

  it('adopts local lists and tasks on first connect, merges same-named lists, and repeats without duplicates', async () => {
    const first = await device('code-ada', {
      localData: async (store) => {
        const list = await store.createList({ name: 'Groceries' });
        await store.createTask({ description: 'Milk' }, { lists: [list.id] });
      },
    });
    expect(await first.engine.syncNow()).toBe('synced');
    const [accountList] = (await serverState(first)).lists;

    const second = await device('code-ada', {
      localData: async (store) => {
        const groceries = await store.createList({ name: 'groceries' });
        await store.createTask({ description: 'Eggs' }, { lists: [groceries.id] });
        const garden = await store.createList({ name: 'Garden' });
        await store.createTask({ description: 'Mow' }, { lists: [garden.id] });
      },
    });
    expect(await second.engine.syncNow()).toBe('synced');
    const counts = (state) => [state.lists.length, state.tasks.length, state.memberships.length];
    const uploaded = await serverState(second);
    expect(counts(uploaded)).toEqual([2, 3, 3]);
    expect(uploaded.lists.filter((list) => list.name.toLowerCase() === 'groceries').map((list) => list.id)).toEqual([accountList.id]);
    expect((await second.store.listLists()).map((list) => list.name).sort()).toEqual(['Garden', 'Groceries']);

    await second.store.queue.setState('adoption', null);
    expect(await second.engine.syncNow()).toBe('synced');
    expect(counts(await serverState(second))).toEqual([2, 3, 3]);
  });

  it('uploads a note with its task on first connect', async () => {
    const ada = await device('code-ada', {
      localData: async (store) => {
        const list = await store.createList({ name: 'Notes' });
        const task = await store.createTask({ description: 'Annotated' }, { lists: [list.id] });
        await store.addNote(task.id, { text: 'Free range' });
      },
    });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect((await serverState(ada)).notes).toHaveLength(1);
  });

  it('posts a note linked to its occurrence, then makes it global and links it again', async () => {
    const ada = await device('code-ada');
    const task = await ada.store.createTask({ description: 'Water daily', 'lifecycle-rules': { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC' } });
    ada.clock.tick(1000);
    const note = await ada.store.addNote(task.id, { text: 'Roses first' });
    expect(note.occurrence).toBe(1);
    expect(await ada.engine.syncNow()).toBe('synced');
    const stored = async () => (await (await ada.raw('GET', `/api/tasks/${task.id}/notes`, { Accept: 'application/json' })).json())[0];
    expect(await stored()).toMatchObject({ id: note.id, occurrence: 1 });
    ada.clock.tick(60_000);
    await ada.store.editNote(note.id, { occurrence: null });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await stored()).toMatchObject({ id: note.id, text: 'Roses first', occurrence: null });
    ada.clock.tick(60_000);
    await ada.store.editNote(note.id, { text: 'Roses and tulips', occurrence: 1 });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await stored()).toMatchObject({ text: 'Roses and tulips', occurrence: 1 });
    expect(await ada.store.queue.count()).toBe(0);
    expect((await ada.store.notesOfTask(task.id))[0]).toMatchObject({ text: 'Roses and tulips', occurrence: 1 });
  });

  it('merges note edits of two devices by field: the later link wins and the text survives', async () => {
    const phone = await device('code-ada');
    const laptop = await device('code-ada');
    const list = await phone.store.createList({ name: 'Note merge' });
    const task = await phone.store.createTask({ description: 'Water', 'lifecycle-rules': { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC' } }, { lists: [list.id] });
    const note = await phone.store.addNote(task.id, { text: 'Roses' });
    await phone.engine.syncNow();
    await laptop.engine.syncNow();
    expect((await laptop.store.notesOfTask(task.id))[0]).toMatchObject({ id: note.id, occurrence: 1 });

    phone.clock.tick(60_000);
    laptop.clock.tick(120_000);
    await phone.store.editNote(note.id, { text: 'Roses and tulips', occurrence: null });
    // The laptop's later edits end on occurrence 1, so the phone's older unlink loses.
    await laptop.store.editNote(note.id, { occurrence: null });
    await laptop.store.editNote(note.id, { occurrence: 1 });
    await laptop.engine.syncNow();
    await phone.engine.syncNow();
    await laptop.engine.syncNow();
    for (const who of [phone, laptop]) {
      expect((await who.store.notesOfTask(task.id))[0]).toMatchObject({ text: 'Roses and tulips', occurrence: 1 });
    }
    const overwritten = (await phone.store.queue.log()).filter((record) => record.kind === 'overwritten');
    expect(overwritten.map((record) => record.field)).toContain('occurrence');
  });

  it('merges edits of two devices: different fields both survive, and the later edit of one field wins', async () => {
    const phone = await device('code-ada');
    const laptop = await device('code-ada');
    const list = await phone.store.createList({ name: 'Merge' });
    const task = await phone.store.createTask({ description: 'Paint' }, { lists: [list.id] });
    await phone.engine.syncNow();
    await laptop.engine.syncNow();

    phone.clock.tick(60_000);
    laptop.clock.tick(120_000);
    await phone.store.updateTask(task.id, { description: 'Paint the door' });
    await laptop.store.updateTask(task.id, { status: 'in-progress' });
    await phone.engine.syncNow();
    await laptop.engine.syncNow();
    await phone.engine.syncNow();
    for (const who of [phone, laptop]) {
      expect(await who.store.getTask(task.id)).toMatchObject({ description: 'Paint the door', 'current-occurrence': { status: 'in-progress' } });
    }

    phone.clock.tick(60_000);
    laptop.clock.tick(180_000);
    await phone.store.updateTask(task.id, { description: 'Paint the fence' });
    await laptop.store.updateTask(task.id, { description: 'Paint the shed' });
    await laptop.engine.syncNow();
    await phone.engine.syncNow();
    await laptop.engine.syncNow();
    for (const who of [phone, laptop]) {
      expect((await who.store.getTask(task.id)).description).toBe('Paint the shed');
    }
    const overwritten = (await phone.store.queue.log()).filter((record) => record.kind === 'overwritten');
    expect(overwritten).toHaveLength(1);
    expect(overwritten[0]).toMatchObject({ field: 'description', sent: 'Paint the fence', kept: 'Paint the shed' });
  });

  it('ticks a target-3 task three times through events, and another device sees it completed', async () => {
    const phone = await device('code-ada');
    const laptop = await device('code-ada');
    const list = await phone.store.createList({ name: 'Ticks' });
    const task = await phone.store.createTask({ description: 'Exercises', 'lifecycle-rules': { 'target-count': 3 } }, { lists: [list.id] });
    expect(await phone.engine.syncNow()).toBe('synced');
    for (let tick = 0; tick < 3; tick++) {
      phone.clock.tick(60_000);
      await phone.store.postEvent(task.id, 'complete');
    }
    expect(await phone.engine.syncNow()).toBe('synced');
    expect(await phone.store.queue.count()).toBe(0);

    const stored = await (await phone.raw('GET', `/api/tasks/${task.id}`, { Accept: 'application/json' })).json();
    expect(stored['lifecycle-rules']['target-count']).toBe(3);
    expect(stored['current-occurrence']).toMatchObject({ occurrence: 1, 'target-count': 3, 'completion-count': 3, status: 'completed' });
    const events = await (await phone.raw('GET', `/api/tasks/${task.id}/events`, { Accept: 'application/json' })).json();
    const ids = (await phone.store.eventsOfTask(task.id)).filter((event) => event.type === 'complete').map((event) => event.id);
    expect(events.filter((event) => event.type === 'complete').map((event) => event.id).sort()).toEqual([...ids].sort());

    expect(await laptop.engine.syncNow()).toBe('synced');
    expect((await laptop.store.getTask(task.id))['current-occurrence']).toMatchObject({ 'completion-count': 3, status: 'completed' });
    expect((await phone.store.getTask(task.id))['current-occurrence']).toMatchObject({ 'completion-count': 3, status: 'completed' });
  });

  it('makes a task weekly, and the server computes the same period and counts its tick', async () => {
    const ada = await device('code-ada');
    const task = await ada.store.createTask({ description: 'Water the plants', 'lifecycle-rules': { 'target-count': 2 } });
    expect(await ada.engine.syncNow()).toBe('synced');
    ada.clock.tick(60_000);
    const weekly = await ada.store.updateRules(task.id, { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' });
    ada.clock.tick(60_000);
    await ada.store.postEvent(task.id, 'complete');
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await ada.store.queue.count()).toBe(0);
    const stored = await (await ada.raw('GET', `/api/tasks/${task.id}`, { Accept: 'application/json' })).json();
    expect(stored['lifecycle-rules']).toMatchObject({ 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels', 'due-time': null });
    const local = weekly['current-occurrence'];
    expect(Date.parse(stored['current-occurrence']['start-time'])).toBe(Date.parse(local['start-time']));
    expect(Date.parse(stored['current-occurrence']['due-time'])).toBe(Date.parse(local['due-time']));
    expect(stored['current-occurrence']).toMatchObject({ occurrence: 1, 'completion-count': 1, status: 'in-progress', 'close-time': null });
    const occurrences = await (await ada.raw('GET', `/api/tasks/${task.id}/occurrences`, { Accept: 'application/json' })).json();
    expect(occurrences.map((occurrence) => occurrence.occurrence)).toEqual([1]);
    const events = await (await ada.raw('GET', `/api/tasks/${task.id}/events`, { Accept: 'application/json' })).json();
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['create', 'edit-lifecycle-rules', 'complete']));
  });

  it('replays a format 2 backup imported while connected, so the server rebuilds a target-3 task at 2 of 3', async () => {
    const { store: source, clock } = await freshStore();
    clock.now = Date.now() - 2 * 3_600_000;
    const task = await source.createTask({ description: 'Paint the fence' });
    clock.tick(60_000);
    await source.updateRules(task.id, { 'target-count': 3 });
    for (let tick = 0; tick < 2; tick++) {
      clock.tick(60_000);
      await source.postEvent(task.id, 'complete');
    }
    const backup = await exportBackup(source, { appVersion: '0.5.0-pre' });
    source.close();

    const ada = await device('code-ada');
    expect(await ada.engine.syncNow()).toBe('synced');
    await importBackup(ada.store, backup, 'merge', { connected: true });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await ada.store.queue.count()).toBe(0);
    expect((await ada.store.queue.log()).filter((record) => record.kind === 'rejected')).toEqual([]);
    const stored = await (await ada.raw('GET', `/api/tasks/${task.id}`, { Accept: 'application/json' })).json();
    expect(stored['lifecycle-rules']['target-count']).toBe(3);
    expect(stored['current-occurrence']).toMatchObject({ occurrence: 1, 'target-count': 3, 'completion-count': 2, status: 'in-progress' });
    const events = await (await ada.raw('GET', `/api/tasks/${task.id}/events`, { Accept: 'application/json' })).json();
    expect(events.map((event) => [event.id, event.type]).sort()).toEqual(backup.events.map((event) => [event.id, event.type]).sort());
  });

  it('replays a partial rule history with one more rule edit, so the server reaches the exported rules', async () => {
    const { store: source, clock } = await freshStore();
    clock.now = Date.now() - 2 * 3_600_000;
    const task = await source.createTask({ description: 'Sand the deck' });
    clock.tick(60_000);
    await source.updateRules(task.id, { 'target-count': 3 });
    const backup = await exportBackup(source, { appVersion: '0.5.0-pre' });
    source.close();
    // A rule change that left no event, such as one pulled from another device.
    backup['lifecycle-rules'][0]['target-count'] = 5;
    backup.occurrences[0]['target-count'] = 5;

    const ada = await device('code-ada');
    expect(await ada.engine.syncNow()).toBe('synced');
    await importBackup(ada.store, backup, 'merge', { connected: true });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect((await ada.store.queue.log()).filter((record) => record.kind === 'rejected')).toEqual([]);
    const stored = await (await ada.raw('GET', `/api/tasks/${task.id}`, { Accept: 'application/json' })).json();
    expect(stored['lifecycle-rules']['target-count']).toBe(5);
    expect(stored['current-occurrence']).toMatchObject({ 'target-count': 5, 'completion-count': 0, status: 'ready' });
  });

  it('replays ended daily series without a user cancel, and the server closes them with end-recurrence', async () => {
    const day = 86_400_000;
    const midnight = Math.floor(Date.now() / day) * day;
    const { store: source, clock } = await freshStore();
    clock.now = midnight - 3 * day + 9 * 3_600_000;
    const daily = { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC', 'recurrence-end-count': 2 };
    const met = await source.createTask({ description: 'Daily met', 'lifecycle-rules': daily });
    const unmet = await source.createTask({ description: 'Daily unmet', 'lifecycle-rules': daily });
    const backup = await exportBackup(source, { appVersion: '0.5.0-pre' });
    source.close();
    // A connected device keeps no roll-over or completion events made elsewhere: only the exported occurrences tell.
    backup.events = backup.events.filter((event) => event.type === 'create');
    const ended = (task, count) => ({
      'task-id': task.id, occurrence: 2, 'start-time': new Date(midnight - 2 * day).toISOString(), 'due-time': new Date(midnight - day).toISOString(),
      'target-count': 1, 'completion-count': count, status: count ? 'completed' : 'cancelled', 'close-time': new Date(midnight - day).toISOString(),
    });
    backup.occurrences = [ended(met, 1), ended(unmet, 0)];

    const ada = await device('code-ada');
    expect(await ada.engine.syncNow()).toBe('synced');
    await importBackup(ada.store, backup, 'merge', { connected: true });
    expect((await ada.store.queue.all()).filter((entry) => entry.operation === 'post-event').map((entry) => [entry.target['task-id'], entry.fields.type]))
      .toEqual([[met.id, 'complete']]);
    expect(await ada.engine.syncNow()).toBe('synced');
    expect((await ada.store.queue.log()).filter((record) => record.kind === 'rejected')).toEqual([]);
    for (const [task, status] of [[met, 'completed'], [unmet, 'cancelled']]) {
      // The hourly run would roll the task over to now; a task request without `import: true` does so at once.
      const edited = await fetch(`${stack.url}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ada.session.token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: `${task.description}, checked` }),
      });
      expect(edited.status).toBe(200);
      const stored = await (await ada.raw('GET', `/api/tasks/${task.id}`, { Accept: 'application/json' })).json();
      expect(stored['current-occurrence']).toMatchObject({ occurrence: 2, status, 'close-time': expect.any(String) });
      const events = await (await ada.raw('GET', `/api/tasks/${task.id}/events`, { Accept: 'application/json' })).json();
      expect(events.map((event) => event.type)).toContain('end-recurrence');
      expect(events.map((event) => event.type)).not.toContain('cancel');
    }
  });

  it('replays a global note of a recurring task as global, and a linked note on its occurrence', async () => {
    const { store: source, clock } = await freshStore();
    clock.now = Date.now() - 2 * 3_600_000;
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC' };
    const task = await source.createTask({ description: 'Stretch', 'lifecycle-rules': weekly });
    clock.tick(60_000);
    const global = await source.addNote(task.id, { text: 'Any week', occurrence: null });
    const linked = await source.addNote(task.id, { text: 'This week' });
    expect([global.occurrence, linked.occurrence]).toEqual([null, 1]);
    const backup = await exportBackup(source, { appVersion: '0.5.0-pre' });
    source.close();

    const ada = await device('code-ada');
    expect(await ada.engine.syncNow()).toBe('synced');
    await importBackup(ada.store, backup, 'merge', { connected: true });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect((await ada.store.queue.log()).filter((record) => record.kind === 'rejected')).toEqual([]);
    const notes = await (await ada.raw('GET', `/api/tasks/${task.id}/notes`, { Accept: 'application/json' })).json();
    expect(Object.fromEntries(notes.map((note) => [note.id, note.occurrence]))).toEqual({ [global.id]: null, [linked.id]: 1 });
  });

  it('replays partial rule histories across one-off and recurring changes without a refused rule request', async () => {
    const { store: source, clock } = await freshStore();
    clock.now = Date.now() - 2 * 3_600_000;
    const recurring = await source.createTask({ description: 'Recurring later' });
    const oneOff = await source.createTask({ description: 'One-off again' });
    clock.tick(60_000);
    await source.updateRules(recurring.id, { 'target-count': 3 });
    await source.updateRules(oneOff.id, { 'target-count': 2 });
    const backup = await exportBackup(source, { appVersion: '0.5.0-pre' });
    source.close();
    // Unlogged changes: the first task became weekly, and the second ended a recurrence whose interval edit was logged.
    const rulesOf = (task) => backup['lifecycle-rules'].find((rules) => rules['task-id'] === task.id);
    const editOf = (task) => backup.events.find((event) => event['task-id'] === task.id && event.type === 'edit-lifecycle-rules');
    Object.assign(rulesOf(recurring), { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null });
    editOf(recurring).details = { 'target-count': { old: 1, new: 3 }, timezone: { old: null, new: 'UTC' } };
    editOf(oneOff).details = { 'target-count': { old: 1, new: 2 }, 'recurrence-interval': { old: null, new: 2 } };
    backup.occurrences = [];

    const ada = await device('code-ada');
    expect(await ada.engine.syncNow()).toBe('synced');
    await importBackup(ada.store, backup, 'merge', { connected: true });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect((await ada.store.queue.log()).filter((record) => record.kind === 'rejected')).toEqual([]);
    for (const task of [recurring, oneOff]) {
      const stored = await (await ada.raw('GET', `/api/tasks/${task.id}`, { Accept: 'application/json' })).json();
      const expected = Object.fromEntries(Object.entries(rulesOf(task)).filter(([name]) => name !== 'task-id'));
      expect(stored['lifecycle-rules']).toEqual(expected);
    }
  });

  it('reverts an event the server refuses with 409', async () => {
    const ada = await device('code-ada');
    const task = await ada.store.createTask({ description: 'Refused' });
    expect(await ada.engine.syncNow()).toBe('synced');
    ada.clock.tick(60_000);
    await ada.store.postEvent(task.id, 'complete');
    // Another device cancelled the task before this tick, so the tick fails its precondition at its place.
    const cancelTime = new Date(Date.parse(task['creation-time']) + 1000).toISOString();
    const posted = await fetch(`${stack.url}/api/tasks/${task.id}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ada.session.token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '0192f1a2-7c3e-7b4a-9d10-5f2e8a1b2c99', type: 'cancel', 'creation-time': cancelTime }),
    });
    expect(posted.status).toBe(201);
    expect(await ada.engine.syncNow()).toBe('synced');
    expect((await ada.store.queue.log()).filter((record) => record.kind === 'rejected')).toEqual([
      expect.objectContaining({ operation: 'post-event', status: 409 }),
    ]);
    expect((await ada.store.getTask(task.id))['current-occurrence']).toMatchObject({ status: 'cancelled', 'completion-count': 0 });
  });

  it('delivers a purged list as a tombstone', async () => {
    const ada = await device('code-ada');
    const root = await device('code-root');
    const list = await ada.store.createList({ name: 'Doomed' });
    const task = await ada.store.createTask({ description: 'Short-lived' }, { lists: [list.id] });
    await ada.engine.syncNow();
    const before = (await ada.store.queue.getState('cursor')).value;

    expect((await root.raw('DELETE', `/api/lists/${list.id}`)).status).toBe(200);
    const feed = await (await ada.raw('GET', `/api/changes?cursor=${before}`, { Accept: 'application/json' })).json();
    expect(feed.tombstones).toEqual([expect.objectContaining({ type: 'list', id: list.id, reason: 'purged' })]);

    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await ada.store.getList(list.id)).toBeUndefined();
    // A purge deletes the list and its memberships, never its tasks.
    expect(await ada.store.listsOfTask(task.id)).toEqual([]);
    expect(await ada.store.getTask(task.id)).toMatchObject({ description: 'Short-lived' });
  });

  it('purges a trashed task from the recycle bin, and a second device sees a purged tombstone', async () => {
    const ada = await device('code-ada');
    const other = await device('code-ada');
    const task = await ada.store.createTask({ description: 'Purge me' });
    await ada.engine.syncNow();
    await ada.store.deleteTask(task.id);
    await ada.engine.syncNow();
    await other.engine.syncNow();
    expect(await other.store.getTask(task.id)).toMatchObject({ description: 'Purge me' });
    const before = (await other.store.queue.getState('cursor')).value;

    await ada.store.purgeForever('task', task.id);
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await ada.store.queue.count()).toBe(0);
    const feed = await (await other.raw('GET', `/api/changes?cursor=${before}`, { Accept: 'application/json' })).json();
    expect(feed.tombstones).toEqual([expect.objectContaining({ type: 'task', id: task.id, reason: 'purged' })]);
    expect(await other.engine.syncNow()).toBe('synced');
    expect(await other.store.getTask(task.id)).toBeUndefined();
    expect((await serverState(ada)).tasks.map((row) => row.id)).not.toContain(task.id);
  });

  it('empties the recycle bin at the service, so a fresh snapshot keeps it empty', async () => {
    const ada = await device('code-ada');
    const other = await device('code-ada');
    const list = await ada.store.createList({ name: 'Bin list' });
    const task = await ada.store.createTask({ description: 'Bin task' });
    await ada.engine.syncNow();
    await ada.store.deleteList(list.id);
    await ada.store.deleteTask(task.id);
    await ada.engine.syncNow();
    ada.clock.tick(60_000);
    await ada.store.emptyBin();
    expect(await ada.engine.syncNow()).toBe('synced');
    const state = await serverState(ada);
    expect(state.lists.map((row) => row.id)).not.toContain(list.id);
    expect(state.tasks.map((row) => row.id)).not.toContain(task.id);
    await other.engine.syncNow();
    expect(await other.store.listBin()).toEqual([]);
  });

  it('erases the account data from a queued erase, so another device gets tombstones', async () => {
    const ada = await device('code-ada');
    const other = await device('code-ada');
    const list = await ada.store.createList({ name: 'Erase list' });
    const task = await ada.store.createTask({ description: 'Erase task' }, { lists: [list.id] });
    await ada.engine.syncNow();
    await other.engine.syncNow();
    expect(await other.store.getTask(task.id)).toMatchObject({ description: 'Erase task' });
    const before = (await other.store.queue.getState('cursor')).value;

    ada.clock.tick(60_000);
    await ada.store.deleteAllData();
    expect(await ada.store.queue.count()).toBe(1);
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await ada.store.queue.count()).toBe(0);
    expect(await ada.store.queue.log()).toMatchObject([{ kind: 'erased' }]);
    const state = await serverState(ada);
    expect(state.lists).toEqual([]);
    expect(state.tasks).toEqual([]);
    const feed = await (await other.raw('GET', `/api/changes?cursor=${before}`, { Accept: 'application/json' })).json();
    expect(feed.tombstones).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'list', id: list.id }), expect.objectContaining({ type: 'task', id: task.id }),
    ]));
    expect(await other.engine.syncNow()).toBe('synced');
    expect(await other.store.getTask(task.id)).toBeUndefined();
    expect(await other.store.getList(list.id)).toBeUndefined();
  });

  it('brings a purged task back when it was restored on another device', async () => {
    const ada = await device('code-ada');
    const other = await device('code-ada');
    const task = await ada.store.createTask({ description: 'Kept after all' });
    await ada.engine.syncNow();
    await ada.store.deleteTask(task.id);
    await ada.engine.syncNow();
    await other.engine.syncNow();
    await other.store.restoreTask(task.id);
    await other.engine.syncNow();

    await ada.store.purgeForever('task', task.id);
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await ada.store.getTask(task.id)).toMatchObject({ description: 'Kept after all', 'deletion-time': null });
    expect((await ada.store.queue.log()).map((record) => record.message)).toContain('Not deleted: it was restored on another device.');
  });

  it('answers 410 to an expired cursor, and the client fetches a new snapshot', async () => {
    const ada = await device('code-ada');
    const list = await ada.store.createList({ name: 'Cursor' });
    await ada.engine.syncNow();
    const stored = await ada.store.queue.getState('cursor');
    const [user, kind, revision] = Buffer.from(stored.value, 'base64url').toString().split(':');
    const forged = Buffer.from([user, kind, Number(revision) + 100_000].join(':')).toString('base64url');

    const refused = await ada.raw('GET', `/api/changes?cursor=${forged}`, { Accept: 'application/json' });
    expect(refused.status).toBe(410);

    await ada.store.queue.setState('cursor', { ...stored, value: forged });
    ada.fetch.statuses.length = 0;
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(ada.fetch.statuses).toEqual([410, 200]);
    expect((await ada.store.queue.getState('cursor')).value).not.toBe(forged);
    expect(await ada.store.getList(list.id)).toMatchObject({ name: 'Cursor' });
  });

  it('patches, reads, and conditionally reads the user settings, and merges two devices by edit time (SYN-13)', async () => {
    const phone = await device('code-ada');
    const laptop = await device('code-ada');
    const settingsOf = (who) => {
      const storage = memoryStorage();
      const sync = createSettingsSync({ session: who.session, api: createApi({ session: who.session, fetch: who.fetch }), getStorage: () => storage });
      return { storage, sync };
    };
    const one = settingsOf(phone);
    const two = settingsOf(laptop);
    const view = { filter: { statuses: ['ready'] }, order: { field: 'due-time', direction: 'asc' }, group: 'list' };
    writePreference('view.tasks', view, () => one.storage);
    writePreference('lists.order', ['0192f1a2-7c3e-7b4a-9d10-5f2e8a1b2c41'], () => one.storage);
    writePreference('theme', 'dark', () => one.storage);
    expect(await one.sync.run()).toBe('uploaded');

    const read = await phone.raw('GET', '/api/users/me/settings', { Accept: 'application/json' });
    expect(read.status).toBe(200);
    const etag = read.headers.get('etag');
    expect(etag).toBeTruthy();
    const { settings } = await read.json();
    expect(settings['todos.view.tasks']).toMatchObject({ value: view, 'edit-time': expect.any(String) });
    expect(settings['todos.theme']).toBeUndefined();
    expect((await phone.raw('GET', '/api/users/me/settings', { 'If-None-Match': etag })).status).toBe(304);

    expect(await two.sync.run()).toBe('downloaded');
    expect(JSON.parse(two.storage.getItem('todos.view.tasks'))).toEqual(view);
    expect(await two.sync.run()).toBe('unchanged');

    removePreference('view.tasks', () => two.storage);
    expect(await two.sync.run()).toBe('uploaded');
    expect(await one.sync.run()).toBe('downloaded');
    expect(one.storage.getItem('todos.view.tasks')).toBeNull();
    const after = await (await phone.raw('GET', '/api/users/me/settings', { Accept: 'application/json' })).json();
    expect(after.settings['todos.view.tasks'].value).toBeNull();
  });

  it('answers 426 to a client below the minimum version, and the client stops syncing', async () => {
    const stale = await device('code-ada', { version: '0.0.1' });
    const refused = await stale.raw('GET', '/api/lists', { 'Client-Version': 'todos.webapp/0.0.1' });
    expect(refused.status).toBe(426);
    expect(refused.headers.get('upgrade')).toBe('todos.webapp/0.1.0');

    expect(await stale.engine.syncNow()).toBe('stopped');
    expect(stale.engine.state()).toMatchObject({ status: 'update-required', minimum: '0.1.0' });
    const requests = stale.fetch.count;
    expect(await stale.engine.syncNow()).toBe('stopped');
    expect(stale.fetch.count).toBe(requests);
  });
});
