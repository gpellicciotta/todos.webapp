// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountListEditor } from '../../src/js/views/list-editor.js';
import { freshStore, setListFields } from './store-helpers.js';

/**
 * Create a panel stand-in with a body, a title, and a close spy.
 * @returns {{body: HTMLElement, document: Document, setTitle: Function, close: Function, title: () => string}} the panel
 */
function fakePanel() {
  const body = document.createElement('div');
  document.body.append(body);
  let text = '';
  return {
    body, document, close: vi.fn(),
    setTitle: (value) => {
      text = value;
    },
    title: () => text,
  };
}

/**
 * Change a control's value and fire its change event, as leaving a typed field does.
 * @param {HTMLInputElement|HTMLTextAreaElement} control the control
 * @param {string} value the new value
 */
function change(control, value) {
  control.value = value;
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Tell the error text of an invalid control.
 * @param {HTMLElement} control the control
 * @returns {string|null} the error text, or null for a valid control
 */
function errorOf(control) {
  if (control.getAttribute('aria-invalid') !== 'true') {
    return null;
  }
  return control.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id))
    .find((element) => element?.matches('.field__error'))?.textContent ?? null;
}

describe('mountListEditor', () => {
  let store;
  let panel;
  let editor;
  let toaster;
  let navigate;

  /**
   * Mount the editor of a route and wait for its first fill.
   * @param {object} route the editor route
   * @param {object} [extra] more editor context, such as a connected session
   * @returns {Promise<{name: HTMLInputElement, description: HTMLTextAreaElement}>} the fields
   */
  async function mount(route, extra = {}) {
    editor = mountListEditor(panel, route, { store, toaster, navigate, ...extra });
    await editor.idle();
    return { name: panel.body.querySelector('input[name="name"]'), description: panel.body.querySelector('textarea[name="description"]') };
  }

  beforeEach(async () => {
    document.body.innerHTML = '';
    ({ store } = await freshStore());
    panel = fakePanel();
    toaster = { show: vi.fn() };
    navigate = vi.fn();
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
    store.close();
  });

  it('fills the name and description of a list and saves each change, with no Save button (LST-4)', async () => {
    const home = await store.createList({ name: 'Home', description: 'Chores' });
    const { name, description } = await mount({ name: 'list-edit', params: { listId: home.id } });
    expect(panel.title()).toBe('List');
    expect(name.value).toBe('Home');
    expect(description.value).toBe('Chores');
    expect(document.activeElement).toBe(name);
    expect(panel.body.querySelector('.field__counter').textContent).toBe('6 / 1000');
    expect([...panel.body.querySelectorAll('button')].map((button) => button.textContent)).not.toContain('Save');
    change(name, 'House');
    change(description, 'Chores and repairs');
    await editor.idle();
    expect(await store.getList(home.id)).toMatchObject({ name: 'House', description: 'Chores and repairs' });
  });

  it('shows a field error for an empty or duplicate name and saves nothing (LST-3)', async () => {
    const home = await store.createList({ name: 'Home' });
    await store.createList({ name: 'Work' });
    const { name } = await mount({ name: 'list-edit', params: { listId: home.id } });
    change(name, '   ');
    await editor.idle();
    expect(errorOf(name)).toBe('A list needs a name.');
    change(name, 'work');
    await editor.idle();
    expect(errorOf(name)).toBe('A list named "Work" already exists.');
    expect((await store.getList(home.id)).name).toBe('Home');
    change(name, 'Garden');
    await editor.idle();
    expect(errorOf(name)).toBeNull();
    expect((await store.getList(home.id)).name).toBe('Garden');
  });

  it('creates a valid draft only through Create, including its description (LST-1)', async () => {
    await store.createList({ name: 'Work' });
    const { name, description } = await mount({ name: 'list-new', params: {} });
    expect(panel.title()).toBe('New list');
    expect(document.activeElement).toBe(name);
    expect(panel.body.querySelector('[data-section="details"]').hidden).toBe(true);
    expect(panel.body.querySelector('.editor-panel__danger').hidden).toBe(true);
    const create = [...panel.body.querySelectorAll('button')].find((button) => button.textContent === 'Create');
    expect(create).toBeDefined();
    expect(create.disabled).toBe(true);
    change(description, 'Flowers and vegetables');
    change(name, '');
    await editor.idle();
    expect(errorOf(name)).toBe('A list needs a name.');
    change(name, 'WORK');
    await editor.idle();
    expect(errorOf(name)).toBe('A list named "Work" already exists.');
    expect(create.disabled).toBe(true);
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Work']);
    change(name, 'Garden');
    change(description, 'Flowers, herbs, and vegetables');
    await editor.idle();
    expect(create.disabled).toBe(false);
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Work']);
    create.click();
    create.click();
    await editor.idle();
    const lists = await store.listLists();
    expect(lists.map((list) => [list.name, list.description])).toEqual([['Garden', 'Flowers, herbs, and vegetables'], ['Work', '']]);
    expect(panel.body.querySelector('[data-section="details"]').hidden).toBe(false);
    expect(panel.body.querySelector('.editor-panel__danger').hidden).toBe(false);
  });

  it('creates nothing when a new list closes before its name is valid', async () => {
    await store.createList({ name: 'Work' });
    const { description } = await mount({ name: 'list-new', params: {} });
    change(description, 'Typed, never saved');
    editor.destroy();
    editor = null;
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Work']);
    const second = await mount({ name: 'list-new', params: {} });
    second.name.value = 'work';
    editor.destroy();
    editor = null;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Work']);
  });

  it('discards a typed valid name when the new editor closes', async () => {
    const { name } = await mount({ name: 'list-new', params: {} });
    name.value = 'Garden';
    const closing = editor;
    editor = null;
    closing.destroy();
    await closing.idle();
    expect(await store.listLists()).toEqual([]);
  });

  it('creates on Enter in the name field, but not on ordinary draft changes', async () => {
    const { name } = await mount({ name: 'list-new', params: {} });
    change(name, 'Garden');
    await editor.idle();
    expect(await store.listLists()).toEqual([]);
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await editor.idle();
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Garden']);
  });

  it('locks draft fields during submission and unlocks them once created', async () => {
    const { name, description } = await mount({ name: 'list-new', params: {} });
    change(name, 'Garden');
    await editor.idle();
    const write = store.createList.bind(store);
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    vi.spyOn(store, 'createList').mockImplementation(async (draft) => {
      await gate;
      return write(draft);
    });
    panel.body.querySelector('button').click();
    expect(name.disabled).toBe(true);
    expect(description.disabled).toBe(true);
    release();
    await editor.idle();
    expect(name.disabled).toBe(false);
    expect(description.disabled).toBe(false);
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Garden']);
  });

  it('rejects a recycled duplicate and an overlong description without creating a draft', async () => {
    const home = await store.createList({ name: 'Home' });
    await store.deleteList(home.id);
    const { name, description } = await mount({ name: 'list-new', params: {} });
    change(name, 'HOME');
    await editor.idle();
    expect(errorOf(name)).toBe('A list named "Home" already exists in the recycle bin.');
    change(name, 'Garden');
    change(description, 'x'.repeat(1001));
    await editor.idle();
    expect(errorOf(description)).toMatch(/1000/);
    expect(panel.body.querySelector('button').disabled).toBe(true);
    expect(await store.listLists()).toEqual([]);
  });

  it('saves a name fixed after an error when the editor closes without a change event', async () => {
    const home = await store.createList({ name: 'Home' });
    const { name } = await mount({ name: 'list-edit', params: { listId: home.id } });
    change(name, '');
    await editor.idle();
    expect(errorOf(name)).toBe('A list needs a name.');
    name.value = 'Garden';
    const closing = editor;
    editor = null;
    closing.destroy();
    await vi.waitFor(async () => expect((await store.getList(home.id)).name).toBe('Garden'));
  });

  it('links the description to its character counter, also while it shows an error', async () => {
    const home = await store.createList({ name: 'Home' });
    const { description } = await mount({ name: 'list-edit', params: { listId: home.id } });
    const counter = panel.body.querySelector('.field__counter');
    expect(description.getAttribute('aria-describedby').split(' ')).toContain(counter.id);
    change(description, 'x'.repeat(1001));
    await editor.idle();
    expect(errorOf(description)).toMatch(/1000/);
    expect(description.getAttribute('aria-describedby').split(' ')).toContain(counter.id);
  });

  it('shows the creation time and, in local mode, only a link to connect in the Sharing section', async () => {
    const home = await store.createList({ name: 'Home' });
    await mount({ name: 'list-edit', params: { listId: home.id } });
    expect(panel.body.querySelector('.editor-panel__details').textContent).toMatch(/^Created /);
    const sharing = panel.body.querySelector('[data-section="sharing"]');
    expect(sharing.querySelector('h3').textContent).toBe('Sharing');
    const link = sharing.querySelector('a');
    expect(link.textContent).toBe('Connect to share this list');
    expect(link.getAttribute('href')).toBe('#/connect');
  });

  it('deletes a list after a confirmation stating its tasks stay, then opens All tasks with Undo (LST-6, LST-7)', async () => {
    const home = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Buy paint' }, { lists: [home.id] });
    await mount({ name: 'list-edit', params: { listId: home.id } });
    const remove = [...panel.body.querySelectorAll('button')].find((button) => button.textContent === 'Delete list');
    remove.click();
    const dialog = document.querySelector('dialog');
    expect(dialog.open).toBe(true);
    expect(remove.classList.contains('button--danger')).toBe(true);
    expect(dialog.querySelector('[data-dialog-close="delete"]').className).toBe('button button--danger');
    expect(dialog.querySelector('[data-dialog-close="cancel"]').classList.contains('button--danger')).toBe(false);
    expect(dialog.querySelector('h2').textContent).toBe('Delete the list Home?');
    expect(dialog.querySelector('p').textContent).toBe('The list moves to the recycle bin. Its tasks stay in your other lists.');
    dialog.querySelector('[data-dialog-close="delete"]').click();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('#/tasks'));
    expect((await store.getList(home.id))['deletion-time']).not.toBeNull();
    expect((await store.getTask(task.id))['deletion-time']).toBeNull();
    expect(toaster.show).toHaveBeenCalledWith('List moved to the recycle bin.', expect.objectContaining({ undo: true }));
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('closes an open Delete list dialog as Keep when the editor closes', async () => {
    const home = await store.createList({ name: 'Home' });
    await mount({ name: 'list-edit', params: { listId: home.id } });
    [...panel.body.querySelectorAll('button')].find((button) => button.textContent === 'Delete list').click();
    const dialog = document.querySelector('dialog');
    expect(dialog.open).toBe(true);
    editor.destroy();
    editor = null;
    expect(dialog.open).toBe(false);
    await vi.waitFor(() => expect(dialog.isConnected).toBe(false));
    expect((await store.getList(home.id))['deletion-time']).toBeNull();
  });

  it('keeps the list when the confirmation is answered with Keep', async () => {
    const home = await store.createList({ name: 'Home' });
    await mount({ name: 'list-edit', params: { listId: home.id } });
    [...panel.body.querySelectorAll('button')].find((button) => button.textContent === 'Delete list').click();
    document.querySelector('[data-dialog-close="cancel"]').click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(navigate).not.toHaveBeenCalled();
    expect((await store.getList(home.id))['deletion-time']).toBeNull();
  });
});

describe('mountListEditor by role (SHR-3, SHR-4)', () => {
  let store;
  let panel;
  let editor;
  let api;
  const connected = { state: () => 'connected', account: () => ({ name: 'Jane Doe', email: 'jane@example.com' }), subscribe: () => () => {} };
  const sam = { id: 9, email: 'sam@example.com', name: 'Sam Roe' };

  /**
   * Store a shared list and open its editor with a connected session.
   * @param {object} fields the sync fields of the list: `role`, `owner`, and `sharing`
   * @param {string} [routeName] the editor route name
   * @returns {Promise<object>} the list
   */
  async function open(fields, routeName = 'list-edit') {
    const list = await store.createList({ name: 'Home', description: 'Chores' });
    await setListFields(store, list.id, fields);
    editor = mountListEditor(panel, { name: routeName, params: { listId: list.id } }, {
      store, toaster: { show: vi.fn() }, navigate: vi.fn(), session: connected, api,
    });
    await editor.idle();
    return list;
  }

  const buttons = () => [...panel.body.querySelectorAll('button')].filter((button) => !button.closest('[hidden]')).map((button) => button.textContent);

  beforeEach(async () => {
    document.body.innerHTML = '';
    ({ store } = await freshStore());
    panel = fakePanel();
    api = { send: vi.fn(async () => ({ status: 200, ok: true, headers: { get: () => null }, body: [] })) };
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
    store.close();
  });

  it('offers the owner the editable fields, the Sharing controls, and Delete list', async () => {
    await open({ role: 'owner', owner: { id: 3, name: 'Jane Doe' }, sharing: [] });
    expect(panel.body.querySelector('input[name="name"]').disabled).toBe(false);
    expect(panel.body.querySelector('[data-section="sharing"] button[data-sharing="invite"]')).not.toBeNull();
    expect(buttons()).toContain('Delete list');
    expect(panel.body.querySelector('.editor-panel__details').textContent).toContain('Jane Doe');
  });

  it('lets an editor edit the list but not share or delete it', async () => {
    await open({ role: 'editor', owner: sam, sharing: [] });
    expect(panel.body.querySelector('input[name="name"]').disabled).toBe(false);
    expect(panel.body.querySelector('textarea[name="description"]').disabled).toBe(false);
    expect(panel.body.querySelector('[data-section="sharing"] button')).toBeNull();
    expect(panel.body.querySelector('[data-sharing="own-role"]').textContent).toContain('Editor');
    expect(buttons()).not.toContain('Delete list');
  });

  it.each(['task-editor', 'viewer'])('shows a %s the list read-only with a banner naming the owner', async (role) => {
    await open({ role, owner: sam, sharing: [] });
    expect(panel.body.querySelector('input[name="name"]').disabled).toBe(true);
    expect(panel.body.querySelector('textarea[name="description"]').disabled).toBe(true);
    expect(panel.body.querySelector('.banner').textContent).toContain('Sam Roe');
    expect(panel.body.querySelector('[data-sharing="owner"]').textContent).toContain('Sam Roe');
    expect(buttons()).toEqual([]);
    expect(api.send).not.toHaveBeenCalled();
  });

  it('scrolls to the Sharing section when opened with Share list', async () => {
    const scrolled = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function scroll() {
      scrolled(this.dataset.section);
    };
    try {
      await open({ role: 'owner', owner: { id: 3, name: 'Jane Doe' }, sharing: [] }, 'list-share');
      expect(scrolled).toHaveBeenCalledWith('sharing');
    }
    finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
  });
});
