import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/js/store/db.js';
import { freshStore } from './store-helpers.js';

let store;
let clock;

beforeEach(async () => {
  ({ store, clock } = await freshStore());
});

afterEach(() => {
  store.close();
});

describe('createList', () => {
  it('creates a list with a UUIDv7 identifier and timestamps', async () => {
    const list = await store.createList({ name: 'Home', description: 'Chores' });
    expect(list.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(list.id[14]).toBe('7');
    expect(list).toMatchObject({
      name: 'Home',
      description: 'Chores',
      'creation-time': '2026-11-04T09:00:00.000Z',
      'last-update-time': '2026-11-04T09:00:00.000Z',
      'deletion-time': null,
    });
    expect(await store.getList(list.id)).toEqual(list);
  });

  it('accepts a client-supplied identifier', async () => {
    const id = '0192f1a2-0000-7000-8000-000000000001';
    const list = await store.createList({ id, name: 'Work' });
    expect(list.id).toBe(id);
  });

  it('trims the name and defaults the description to empty', async () => {
    const list = await store.createList({ name: '  Travel  ' });
    expect(list.name).toBe('Travel');
    expect(list.description).toBe('');
  });

  it.each([
    ['an empty name', { name: '' }, 'name', 'required'],
    ['a blank name', { name: '   ' }, 'name', 'required'],
    ['a name over 100 characters', { name: 'x'.repeat(101) }, 'name', 'too-long'],
    ['a description over 1000 characters', { name: 'A', description: 'x'.repeat(1001) }, 'description', 'too-long'],
  ])('rejects %s', async (_, input, field, code) => {
    const error = await store.createList(input).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ field, code });
  });

  it('accepts names of exactly 1 and 100 characters', async () => {
    await expect(store.createList({ name: 'x' })).resolves.toBeTruthy();
    await expect(store.createList({ name: 'y'.repeat(100) })).resolves.toBeTruthy();
  });

  it('rejects a duplicate name that differs only in case', async () => {
    await store.createList({ name: 'Groceries' });
    const error = await store.createList({ name: 'groceries' }).catch((e) => e);
    expect(error).toMatchObject({ field: 'name', code: 'duplicate' });
    expect(await store.listLists()).toHaveLength(1);
  });
});

describe('updateList', () => {
  it('renames and describes a list, updating its last update time', async () => {
    const list = await store.createList({ name: 'Home' });
    clock.tick(5000);
    const updated = await store.updateList(list.id, { name: 'House', description: 'Repairs' });
    expect(updated).toMatchObject({
      name: 'House',
      description: 'Repairs',
      'creation-time': list['creation-time'],
      'last-update-time': '2026-11-04T09:00:05.000Z',
    });
  });

  it('allows keeping the same name with a different case', async () => {
    const list = await store.createList({ name: 'home' });
    await expect(store.updateList(list.id, { name: 'Home' })).resolves.toMatchObject({ name: 'Home' });
  });

  it('rejects renaming to the name of another list', async () => {
    await store.createList({ name: 'Home' });
    const work = await store.createList({ name: 'Work' });
    const error = await store.updateList(work.id, { name: 'HOME' }).catch((e) => e);
    expect(error).toMatchObject({ field: 'name', code: 'duplicate' });
  });

  it('treats missing changes as no change', async () => {
    const list = await store.createList({ name: 'Home' });
    await expect(store.updateList(list.id)).resolves.toMatchObject({ name: 'Home' });
  });

  it('fails for an unknown list', async () => {
    const error = await store.updateList('0192f1a2-0000-7000-8000-00000000ffff', { name: 'X' }).catch((e) => e);
    expect(error).toMatchObject({ code: 'not-found' });
  });
});

describe('listLists', () => {
  it('returns lists sorted by name, case-insensitively', async () => {
    await store.createList({ name: 'work' });
    await store.createList({ name: 'Home' });
    await store.createList({ name: 'errands' });
    const names = (await store.listLists()).map((list) => list.name);
    expect(names).toEqual(['errands', 'Home', 'work']);
  });
});
