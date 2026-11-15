import { IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { openStore } from '../../src/js/store/db.js';
import { freshStore } from './store-helpers.js';

const TRACKED = { tracking: () => true };

describe('the change queue', () => {
  it('survives a reload and keeps the original order', async () => {
    const { store, clock, factory } = await freshStore(TRACKED);
    const list = await store.createList({ name: 'Home' });
    clock.tick();
    const task = await store.createTask({ description: 'Paint' }, { lists: [list.id] });
    clock.tick();
    await store.updateTask(task.id, { status: 'in-progress' });
    store.close();
    const reopened = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test', now: () => new Date(clock.now), ...TRACKED });
    const entries = await reopened.queue.all();
    expect(entries.map((entry) => entry.operation)).toEqual(['create-list', 'create-task', 'post-event']);
    expect(entries.map((entry) => entry.seq)).toEqual([...entries.map((entry) => entry.seq)].sort((a, b) => a - b));
    expect(entries[1].target).toEqual({ type: 'task', id: task.id });
    expect(entries[1].fields.lists).toEqual([list.id]);
  });

  it('records only the changed fields of an update, each with its edit time', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint', status: 'ready' });
    clock.tick(5000);
    const updated = await store.updateTask(task.id, { description: 'Paint the fence', status: 'ready' });
    const list = await store.createList({ name: 'Home' });
    clock.tick(5000);
    await store.updateList(list.id, { name: 'Home', description: 'Rooms' });
    const entries = await store.queue.all();
    const taskUpdate = entries.find((entry) => entry.operation === 'update-task');
    expect(taskUpdate.fields).toEqual({ description: 'Paint the fence' });
    expect(taskUpdate['edit-times']).toEqual({ description: updated['last-update-time'] });
    const listUpdate = entries.find((entry) => entry.operation === 'update-list');
    expect(listUpdate.fields).toEqual({ description: 'Rooms' });
    expect(Object.keys(listUpdate['edit-times'])).toEqual(['description']);
  });

  it('records nothing in local mode and nothing for a change that changes nothing', async () => {
    const local = await freshStore();
    await local.store.createList({ name: 'Home' });
    expect(await local.store.queue.count()).toBe(0);
    const { store } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint' });
    await store.updateTask(task.id, { description: 'Paint' });
    expect(await store.queue.count()).toBe(1);
  });

  it('records memberships, notes, and recycle bin changes in order', async () => {
    const { store } = await freshStore(TRACKED);
    const list = await store.createList({ name: 'Home' });
    const other = await store.createList({ name: 'Work' });
    const first = await store.createTask({ description: 'One' });
    const second = await store.createTask({ description: 'Two' });
    await store.addToList(first.id, list.id);
    await store.addToList(second.id, list.id);
    await store.moveInList(second.id, list.id, { before: first.id });
    await store.removeFromList(first.id, list.id);
    const note = await store.addNote(first.id, { text: 'Hi' });
    await store.editNote(note.id, 'Hello');
    await store.deleteNote(note.id);
    await store.deleteTask(second.id);
    await store.restoreTask(second.id);
    await store.deleteList(other.id);
    await store.restoreList(other.id);
    const entries = await store.queue.all();
    expect(entries.slice(4).map((entry) => entry.operation)).toEqual([
      'add-membership', 'add-membership', 'move-membership', 'remove-membership',
      'create-note', 'edit-note', 'delete-note', 'delete-task', 'restore-task', 'delete-list', 'restore-list',
    ]);
    expect(entries.find((entry) => entry.operation === 'move-membership').fields).toEqual({ before: first.id });
    expect(entries.find((entry) => entry.operation === 'edit-note').fields).toEqual({ text: 'Hello' });
  });

  it('undoes entries on the local data', async () => {
    const { store } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint' });
    await store.updateTask(task.id, { description: 'Paint more' });
    const [create, update] = await store.queue.all();
    await store.queue.undo(store, update);
    expect((await store.getTask(task.id)).description).toBe('Paint');
    await store.queue.undo(store, create);
    expect(await store.getTask(task.id)).toBeUndefined();
  });
});

describe('queued events and rule edits', () => {
  it('creates a task with its rules, and queues each status edit as events in order (SYN-1)', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint', 'due-time': '2026-11-08T18:00:00Z' });
    clock.tick();
    await store.updateTask(task.id, { status: 'completed' });
    clock.tick();
    await store.updateTask(task.id, { status: 'in-progress' });
    const [create, ...events] = await store.queue.all();
    expect(create.fields).toEqual({
      id: task.id,
      description: 'Paint',
      'lifecycle-rules': task['lifecycle-rules'],
      'creation-time': task['creation-time'],
      lists: [],
    });
    expect(events.map((entry) => [entry.operation, entry.fields.type, entry.fields['creation-time'], entry.fields.occurrence])).toEqual([
      ['post-event', 'complete', '2026-11-04T09:00:01.000Z', 1],
      ['post-event', 'uncomplete', '2026-11-04T09:00:02.000Z', 1],
      ['post-event', 'start', '2026-11-04T09:00:02.000Z', 1],
    ]);
    const stored = await store.eventsOfTask(task.id);
    expect(events.map((entry) => entry.target)).toEqual(stored.slice(1).map((event) => ({ type: 'event', id: event.id, 'task-id': task.id })));
    expect(events.map((entry) => entry.fields.id)).toEqual(stored.slice(1).map((event) => event.id));
  });

  it('queues a deadline edit as a rule edit with its edit time, and an event action as one event', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint' });
    clock.tick(5000);
    await store.updateTask(task.id, { 'due-time': '2026-11-08T18:00:00Z', 'overdue-handling': 'cancel' });
    await store.postEvent(task.id, 'start');
    const [, rules, event] = await store.queue.all();
    expect(rules).toMatchObject({
      target: { type: 'rules', id: task.id },
      operation: 'update-rules',
      fields: { 'due-time': '2026-11-08T18:00:00.000Z', 'overdue-handling': 'cancel' },
      'edit-times': { 'due-time': '2026-11-04T09:00:05.000Z', 'overdue-handling': '2026-11-04T09:00:05.000Z' },
    });
    expect(event).toMatchObject({ operation: 'post-event', fields: { type: 'start', occurrence: 1 } });
  });

  it('queues no system event: an overdue expire stays local', async () => {
    const { store } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Late', 'due-time': '2026-11-04T08:00:00Z', 'overdue-handling': 'cancel' });
    await store.expireTask(task.id);
    expect((await store.queue.all()).map((entry) => entry.operation)).toEqual(['create-task']);
  });

  it('undoes a rejected event and refolds the events queued after it', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Count', 'lifecycle-rules': { 'target-count': 3 } });
    for (let tick = 0; tick < 3; tick++) {
      clock.tick();
      await store.postEvent(task.id, 'complete');
    }
    const [, first] = await store.queue.all();
    await store.queue.undo(store, first);
    const after = await store.getTask(task.id);
    expect(after['current-occurrence']).toMatchObject({ 'completion-count': 2, status: 'in-progress', 'close-time': null });
    expect((await store.eventsOfTask(task.id)).map((event) => event.id)).not.toContain(first.target.id);
  });

  it('restores the original occurrence when every queued event is rolled back in turn (SYN-9)', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Count', 'lifecycle-rules': { 'target-count': 3 } });
    for (let tick = 0; tick < 3; tick++) {
      clock.tick();
      await store.postEvent(task.id, 'complete');
    }
    for (let entry = (await store.queue.all())[1]; entry; entry = (await store.queue.all())[1]) {
      await store.queue.undo(store, entry);
      await store.queue.remove([entry.seq]);
    }
    expect((await store.getTask(task.id))['current-occurrence']).toMatchObject({ 'completion-count': 0, status: 'ready', 'close-time': null });
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual(['create']);
  });

  it('restores the rules and occurrence when a rule edit and the event after it are both rolled back', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Count', 'lifecycle-rules': { 'target-count': 2 } });
    await store.postEvent(task.id, 'complete');
    await store.queue.clear();
    clock.tick();
    await store.updateRules(task.id, { 'target-count': 1 });
    clock.tick();
    await store.postEvent(task.id, 'uncomplete');
    const [rules, event] = await store.queue.all();
    await store.queue.undo(store, rules);
    await store.queue.remove([rules.seq]);
    expect((await store.getTask(task.id))['current-occurrence']).toMatchObject({ 'target-count': 2, 'completion-count': 0, status: 'ready' });
    await store.queue.undo(store, (await store.queue.all())[0]);
    expect(event.operation).toBe('post-event');
    const after = await store.getTask(task.id);
    expect(after['lifecycle-rules']['target-count']).toBe(2);
    expect(after['current-occurrence']).toMatchObject({ 'target-count': 2, 'completion-count': 1, status: 'in-progress', 'close-time': null });
  });
});

describe('queued note links', () => {
  const DAILY = { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC' };

  it('sends the occurrence of a linked or explicitly global note, and leaves an unplaced one to the service', async () => {
    const { store } = await freshStore(TRACKED);
    const daily = await store.createTask({ description: 'Water', 'lifecycle-rules': DAILY });
    const oneOff = await store.createTask({ description: 'Paint' });
    await store.addNote(daily.id, { text: 'Linked' });
    await store.addNote(daily.id, { text: 'Whole task', occurrence: null });
    await store.addNote(oneOff.id, { text: 'Unplaced' });
    const creates = (await store.queue.all()).filter((entry) => entry.operation === 'create-note');
    expect(creates.map((entry) => entry.fields.occurrence)).toEqual([1, null, undefined]);
    expect('occurrence' in creates[2].fields).toBe(false);
  });

  it('sends only the changed note fields, each with its edit time', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const oneOff = await store.createTask({ description: 'Paint' });
    const note = await store.addNote(oneOff.id, { text: 'Hi' });
    clock.tick();
    const linked = await store.editNote(note.id, { text: 'Hi', occurrence: 1 });
    clock.tick();
    const both = await store.editNote(note.id, { text: 'Hello', occurrence: null });
    const edits = (await store.queue.all()).filter((entry) => entry.operation === 'edit-note');
    expect(edits.map((entry) => entry.fields)).toEqual([{ occurrence: 1 }, { text: 'Hello', occurrence: null }]);
    expect(edits[0]['edit-times']).toEqual({ occurrence: linked['last-update-time'] });
    expect(edits[1]['edit-times']).toEqual({ text: both['last-update-time'], occurrence: both['last-update-time'] });
  });

  it('restores the previous link and text when a rejected note edit is undone', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const oneOff = await store.createTask({ description: 'Paint' });
    const note = await store.addNote(oneOff.id, { text: 'Hi' });
    clock.tick();
    await store.editNote(note.id, { text: 'Hello', occurrence: 1 });
    const edit = (await store.queue.all()).find((entry) => entry.operation === 'edit-note');
    await store.queue.undo(store, edit);
    expect((await store.notesOfTask(oneOff.id))[0]).toMatchObject({ text: 'Hi', occurrence: null });
  });

  it('still undoes a note text entry queued before links existed', async () => {
    const { store } = await freshStore(TRACKED);
    const oneOff = await store.createTask({ description: 'Paint' });
    const note = await store.addNote(oneOff.id, { text: 'Hi' });
    await store.editNote(note.id, 'Hello');
    const edit = (await store.queue.all()).find((entry) => entry.operation === 'edit-note');
    await store.queue.undo(store, { ...edit, undo: { kind: 'note-text', taskId: oneOff.id, id: note.id, from: 'Hi', to: 'Hello' } });
    expect((await store.notesOfTask(oneOff.id))[0].text).toBe('Hi');
  });
});
