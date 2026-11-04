// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openImportDialog } from '../../src/js/views/import-dialog.js';

const BACKUP = readFileSync('tests/fixtures/backup-v1.json', 'utf8');
const COUNTS = { added: 1, updated: 0, binned: 0, removed: 0, skipped: 0 };

/**
 * Pick a file in the dialog's file field.
 * @param {HTMLInputElement} input the file field
 * @param {() => Promise<string>} text reads the file
 */
function pick(input, text) {
  Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'todos-backup.json', text }] });
  input.dispatchEvent(new Event('change'));
}

/** @returns {Promise<void>} resolves once pending promises and queued tasks have run */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Open the dialog on an empty store stand-in that holds each import until the test settles it.
 * @returns {object} the dialog, its controls, the store, its pending imports, and the dialog's promise
 */
function open() {
  const imports = [];
  const store = {
    snapshot: async () => ({ lists: [], tasks: [], memberships: [], notes: [] }),
    applyChanges: vi.fn(() => imports[imports.push(Promise.withResolvers()) - 1].promise),
  };
  const closed = openImportDialog(document, { store, opener: document.body.appendChild(document.createElement('button')) });
  const dialog = document.querySelector('dialog');
  const [cancel, importButton] = dialog.querySelectorAll('.dialog__actions button');
  return {
    dialog, store, imports, closed, cancel, importButton, input: dialog.querySelector('input[type="file"]'),
    radios: [...dialog.querySelectorAll('input[type="radio"]')], closeButton: dialog.querySelector('.icon-button'),
    error: dialog.querySelector('[role="alert"]'),
  };
}

/**
 * Open the dialog, pick the fixture backup, and start the import.
 * @returns {Promise<object>} the parts of `open`
 */
async function startImport() {
  const parts = open();
  pick(parts.input, async () => BACKUP);
  await settle();
  parts.importButton.click();
  await settle();
  expect(parts.store.applyChanges).toHaveBeenCalledTimes(1);
  return parts;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('openImportDialog', () => {
  it('locks every control while importing, so neither a second import nor a cancel can happen', async () => {
    const { dialog, radios, input, closeButton, cancel, importButton, store, imports, closed } = await startImport();
    expect([...radios, input, closeButton, cancel, importButton].every((control) => control.disabled)).toBe(true);
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change'));
    pick(input, async () => BACKUP);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await settle();
    expect(importButton.disabled).toBe(true);
    expect(dialog.open).toBe(true);
    importButton.click();
    expect(store.applyChanges).toHaveBeenCalledTimes(1);
    imports[0].resolve(COUNTS);
    await expect(closed).resolves.toEqual(COUNTS);
  });

  it('unlocks the controls after a failed import and puts focus on Import', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { radios, input, closeButton, importButton, error, imports } = await startImport();
    imports[0].reject(new Error('disk full'));
    await settle();
    expect(error.hidden).toBe(false);
    expect([...radios, input, closeButton, importButton].some((control) => control.disabled)).toBe(false);
    expect(document.activeElement).toBe(importButton);
  });

  it('ignores a late read failure of an earlier file once a newer file is shown', async () => {
    const { input, error, importButton } = open();
    const slow = Promise.withResolvers();
    pick(input, () => slow.promise);
    pick(input, async () => BACKUP);
    await settle();
    slow.reject(new Error('read failed'));
    await settle();
    expect(error.hidden).toBe(true);
    expect(importButton.disabled).toBe(false);
  });
});
