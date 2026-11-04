// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountListEditor } from '../../src/js/views/list-editor.js';
import { freshStore } from './store-helpers.js';

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
  return document.getElementById(control.getAttribute('aria-describedby'))?.textContent ?? null;
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
   * @returns {Promise<{name: HTMLInputElement, description: HTMLTextAreaElement}>} the fields
   */
  async function mount(route) {
    editor = mountListEditor(panel, route, { store, toaster, navigate });
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

  it('creates a new list once its name is valid, with the description typed before (LST-1)', async () => {
    await store.createList({ name: 'Work' });
    const { name, description } = await mount({ name: 'list-new', params: {} });
    expect(panel.title()).toBe('New list');
    expect(document.activeElement).toBe(name);
    expect(panel.body.querySelector('[data-section="details"]').hidden).toBe(true);
    expect(panel.body.querySelector('.editor-panel__danger').hidden).toBe(true);
    change(description, 'Flowers and vegetables');
    change(name, '');
    await editor.idle();
    expect(errorOf(name)).toBe('A list needs a name.');
    change(name, 'WORK');
    await editor.idle();
    expect(errorOf(name)).toBe('A list named "Work" already exists.');
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Work']);
    change(name, 'Garden');
    change(description, 'Flowers, herbs, and vegetables');
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

  it('saves a typed valid name when the editor closes before the field changes, like the task editor', async () => {
    const { name } = await mount({ name: 'list-new', params: {} });
    name.value = 'Garden';
    const closing = editor;
    editor = null;
    closing.destroy();
    await vi.waitFor(async () => expect((await store.listLists()).map((list) => list.name)).toEqual(['Garden']));
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
    expect(dialog.querySelector('h2').textContent).toBe('Delete the list Home?');
    expect(dialog.querySelector('p').textContent).toBe('The list moves to the recycle bin. Its tasks stay in your other lists.');
    dialog.querySelector('[data-dialog-close="delete"]').click();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('#/tasks'));
    expect((await store.getList(home.id))['deletion-time']).not.toBeNull();
    expect((await store.getTask(task.id))['deletion-time']).toBeNull();
    expect(toaster.show).toHaveBeenCalledWith('List moved to the recycle bin.', expect.objectContaining({ undo: true }));
    expect(document.querySelector('dialog')).toBeNull();
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
