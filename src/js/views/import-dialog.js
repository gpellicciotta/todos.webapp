/**
 * Import backup dialog: pick a file, see its export date and counts, choose Merge or Overwrite, then confirm.
 *
 * An invalid file shows its reason and keeps Import disabled (`BAK-13`).
 * The counts of added, updated, and binned items follow the chosen mode (`BAK-11`).
 * Import applies the backup in one transaction; Cancel, Escape, and Close change nothing (`BAK-12`).
 * While connected, Overwrite is off, since an import never removes data from the account, and Merge queues
 * its changes for upload. The dialog then stays open on the sync progress, Syncing and then Synced, until Done.
 * While the import runs, every control is locked and the dialog cannot be cancelled.
 * Below 64rem it opens in the main view, between the bars, as the editors do: not modal, without a scrim,
 * and a route change or growing to 64rem cancels it. The main column it covers is inert meanwhile.
 * From 64rem it stays a modal dialog.
 */

import { importBackup, parseBackup, previewImport } from '../core/backup.js';
import { openDialog } from '../ui/dialog.js';
import { make, spriteIcon } from './task-list.js';

/** Dialog strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  title: 'Import backup',
  close: 'Close',
  file: 'Backup file',
  fileHint: 'Choose a todos-backup file exported from ToDo\'s.',
  mode: 'Import mode',
  modes: Object.freeze({
    merge: Object.freeze({ label: 'Merge', hint: 'Add and update items; keep the rest.' }),
    overwrite: Object.freeze({ label: 'Overwrite', hint: 'Replace your data; missing items go to the recycle bin.' }),
  }),
  overwriteConnected: 'Replacing data is not available while connected: an import never removes data from your account.',
  summary: (date, lists, tasks) => `Exported ${date} · ${plural(lists, 'list')} · ${plural(tasks, 'task')}`,
  counts: ({ added, updated, binned, removed }) => [`${added} added`, `${updated} updated`, `${binned} to recycle bin`,
    ...(removed > 0 ? [`${removed} removed`] : [])].join(' · '),
  unreadable: 'The file could not be read. Choose it again.',
  failed: 'The import failed, and nothing changed. Try again.',
  imported: (name, counts) => `Imported ${name}: ${STRINGS.counts(counts)}.`,
  importAction: 'Import',
  done: 'Done',
  cancel: 'Cancel',
  syncing: (pending, progress) => {
    if (progress) {
      return `Syncing ${progress.done} of ${progress.total}…`;
    }
    return pending > 0 ? `Syncing ${plural(pending, 'change')}…` : 'Syncing…';
  },
  synced: 'Synced.',
  offline: (pending) => (pending > 0 ? `Offline. ${plural(pending, 'change')} will sync when you are back online.` : 'Offline. Changes sync when you are back online.'),
  signIn: (pending) => (pending > 0 ? `Sign in again to sync ${plural(pending, 'change')}.` : 'Sign in again to sync.'),
  syncFailed: 'Syncing failed. It will try again.',
  updateRequired: 'Update the app to sync your changes.',
  localOnly: 'You are not connected. The changes stay on this device.',
});

const COMPACT = '(width < 64rem)';

let dialogs = 0;

/**
 * Return a count with its noun, as in "1 list" or "8 lists".
 * @param {number} count the count
 * @param {string} noun the singular noun
 * @returns {string} the phrase
 */
export function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Format an ISO time as a local date, as in "30 Oct 2026".
 * @param {string} iso the time
 * @returns {string} the date
 */
function formatDate(iso) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

/**
 * Describe the sync progress for the sync status line.
 * @param {{status: string, progress?: {done: number, total: number}|null}} state the sync state
 * @param {number} pending the changes not uploaded yet
 * @returns {string} the line
 */
function syncLine({ status, progress = null }, pending) {
  switch (status) {
    case 'offline':
      return STRINGS.offline(pending);
    case 'sign-in-needed':
      return STRINGS.signIn(pending);
    case 'error':
      return STRINGS.syncFailed;
    case 'update-required':
      return STRINGS.updateRequired;
    case 'local-only':
      return STRINGS.localOnly;
    case 'synced':
      return pending === 0 ? STRINGS.synced : STRINGS.syncing(pending, null);
    default:
      return STRINGS.syncing(pending, progress);
  }
}

/**
 * Create a mode option: a radio in its label, with a hint that describes it.
 * @param {Document} doc the document
 * @param {string} id the identifier prefix
 * @param {string} mode `merge` or `overwrite`
 * @param {string} [unavailable] why the option is off, which disables it
 * @returns {{element: HTMLElement, input: HTMLInputElement}} the option and its radio
 */
function modeOption(doc, id, mode, unavailable = '') {
  const element = make(doc, 'div', 'import-dialog__mode');
  const label = make(doc, 'label', 'choice');
  const input = doc.createElement('input');
  Object.assign(input, { type: 'radio', name: `${id}-mode`, value: mode, checked: mode === 'merge', disabled: unavailable !== '' });
  const hint = make(doc, 'p', 'field__hint import-dialog__mode-hint', unavailable || STRINGS.modes[mode].hint);
  hint.id = `${id}-${mode}-hint`;
  input.setAttribute('aria-describedby', hint.id);
  label.append(input, doc.createTextNode(STRINGS.modes[mode].label));
  element.append(label, hint);
  return { element, input };
}

/**
 * Open the Import backup dialog; it removes itself once closed.
 * @param {Document} doc the document
 * @param {object} context the dialog context
 * @param {object} context.store the store facade
 * @param {{show: (message: string) => void}} [context.toaster] shows the confirmation toast
 * @param {HTMLElement} [context.opener] the control that gets focus back, the focused one by default
 * @param {{state: () => string}} [context.session] the session; connected unless it is local
 * @param {object} [context.sync] the sync engine (`state`, `subscribe`, `pendingCount`), for the progress after a connected import
 * @returns {Promise<object|null>} the import counts, or null when the dialog closed without importing
 */
export function openImportDialog(doc, { store, toaster, opener, session, sync }) {
  dialogs += 1;
  const connected = () => (session?.state() ?? 'local') !== 'local';
  const watching = connected() && Boolean(sync);
  const id = `import-dialog-${dialogs}`;
  const dialog = make(doc, 'dialog', 'dialog import-dialog');
  dialog.setAttribute('aria-labelledby', `${id}-title`);

  const header = make(doc, 'div', 'dialog__header import-dialog__header');
  const title = make(doc, 'h2', 'dialog__title', STRINGS.title);
  title.id = `${id}-title`;
  const closeButton = make(doc, 'button', 'icon-button');
  closeButton.type = 'button';
  closeButton.dataset.dialogClose = 'cancel';
  closeButton.setAttribute('aria-label', STRINGS.close);
  closeButton.append(spriteIcon(doc, 'close'));
  header.append(title, closeButton);

  const field = make(doc, 'div', 'field');
  const label = make(doc, 'label', 'field__label', STRINGS.file);
  label.htmlFor = `${id}-file`;
  const input = make(doc, 'input', 'field__control import-dialog__file');
  Object.assign(input, { id: label.htmlFor, type: 'file', accept: '.json,application/json' });
  const hint = make(doc, 'p', 'field__hint', STRINGS.fileHint);
  hint.id = `${id}-file-hint`;
  const error = make(doc, 'p', 'field__error');
  error.id = `${id}-file-error`;
  error.setAttribute('role', 'alert');
  error.hidden = true;
  const errorText = make(doc, 'span', 'import-dialog__error-text');
  error.append(spriteIcon(doc, 'alert'), errorText);
  input.setAttribute('aria-describedby', hint.id);
  field.append(label, input, hint, error);

  const summary = make(doc, 'div', 'import-dialog__summary');
  const fileName = make(doc, 'p', 'import-dialog__file-name');
  const fileMeta = make(doc, 'p', 'import-dialog__file-meta');
  summary.append(fileName, fileMeta);
  const modes = make(doc, 'fieldset', 'choice-group import-dialog__modes');
  modes.append(make(doc, 'legend', 'visually-hidden', STRINGS.mode));
  const options = ['merge', 'overwrite'].map((mode) => modeOption(doc, id, mode, mode === 'overwrite' && connected() ? STRINGS.overwriteConnected : ''));
  modes.append(...options.map((option) => option.element));
  const counts = make(doc, 'p', 'import-dialog__counts');
  counts.setAttribute('role', 'status');
  const syncStatus = make(doc, 'p', 'import-dialog__counts import-dialog__sync');
  syncStatus.setAttribute('role', 'status');
  syncStatus.hidden = true;
  const preview = make(doc, 'div', 'import-dialog__preview');
  preview.hidden = true;
  preview.append(summary, modes, counts, syncStatus);

  const body = make(doc, 'div', 'dialog__body import-dialog__body');
  body.append(field, preview);
  const actions = make(doc, 'div', 'dialog__actions');
  const cancelButton = make(doc, 'button', 'button button--secondary', STRINGS.cancel);
  cancelButton.type = 'button';
  cancelButton.dataset.dialogClose = 'cancel';
  const importButton = make(doc, 'button', 'button', STRINGS.importAction);
  importButton.type = 'button';
  importButton.disabled = true;
  actions.append(cancelButton, importButton);
  dialog.append(header, body, actions);
  const media = doc.defaultView?.matchMedia?.(COMPACT);
  const app = media?.matches ? doc.querySelector('.app') : null;
  if (app) {
    dialog.classList.add('dialog--in-view');
  }
  (app ?? doc.body).append(dialog);

  let backup = null;
  let name = '';
  let request = 0;
  let result = null;
  let close = () => {};
  let importing = false;
  let finished = false;
  let syncRequest = 0;
  let stopWatching = () => {};

  /**
   * Return what the import needs to know of the connection.
   * @returns {Promise<{connected?: boolean, ownerId?: number|string|null}>} the options of `previewImport` and `importBackup`
   */
  async function importOptions() {
    return connected() ? { connected: true, ownerId: (await store.queue.getState('user-id')) ?? null } : {};
  }

  /**
   * Show the sync progress, ignoring answers that a newer state made stale.
   * @returns {Promise<void>}
   */
  async function refreshSync() {
    const current = ++syncRequest;
    const state = sync.state();
    const pending = await sync.pendingCount();
    if (current === syncRequest) {
      syncStatus.textContent = syncLine(state, pending);
    }
  }

  /** Leave the import view for the sync progress: the dialog stays open until Done. */
  function showSync() {
    finished = true;
    field.hidden = true;
    modes.hidden = true;
    cancelButton.hidden = true;
    importButton.textContent = STRINGS.done;
    counts.textContent = STRINGS.imported(name, result);
    syncStatus.hidden = false;
    stopWatching = sync.subscribe(() => refreshSync());
    refreshSync();
  }

  /** @returns {string} the chosen mode */
  const mode = () => options.find((option) => option.input.checked).input.value;

  /**
   * Show a problem with the file or the import, or clear it.
   * @param {string|null} message the reason, or null to clear it
   */
  function showError(message) {
    error.hidden = message === null;
    errorText.textContent = message ?? '';
    if (message === null) {
      input.removeAttribute('aria-invalid');
      input.setAttribute('aria-describedby', hint.id);
    }
    else {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${hint.id} ${error.id}`);
    }
  }

  /**
   * Count what the chosen mode would change, ignoring answers that a newer choice made stale.
   * @returns {Promise<void>}
   */
  async function refreshCounts() {
    const current = ++request;
    importButton.disabled = true;
    try {
      const planned = await previewImport(store, backup, mode(), await importOptions());
      if (current === request) {
        counts.textContent = STRINGS.counts(planned);
        importButton.disabled = false;
      }
    }
    catch (problem) {
      if (current === request) {
        showError(problem.message);
      }
    }
  }

  /**
   * Read and check the picked file, then show its summary and counts, or its reason for failing.
   * @returns {Promise<void>}
   */
  async function onFile() {
    const current = ++request;
    backup = null;
    preview.hidden = true;
    importButton.disabled = true;
    showError(null);
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    let text;
    try {
      text = await file.text();
    }
    catch {
      text = null;
    }
    if (current !== request) {
      return;
    }
    if (text === null) {
      showError(STRINGS.unreadable);
      return;
    }
    try {
      backup = parseBackup(text);
    }
    catch (problem) {
      showError(problem.message);
      return;
    }
    name = file.name;
    fileName.textContent = name;
    fileMeta.textContent = STRINGS.summary(formatDate(backup['export-time']), backup.lists.length, backup.tasks.length);
    counts.textContent = '';
    preview.hidden = false;
    await refreshCounts();
  }

  /**
   * Apply the import in the chosen mode, then close with a toast; a failure keeps the dialog open.
   * @returns {Promise<void>}
   */
  async function onImport() {
    const locked = [input, ...options.map((option) => option.input), closeButton, cancelButton, importButton].filter((control) => !control.disabled);
    importing = true;
    locked.forEach((control) => {
      control.disabled = true;
    });
    try {
      result = await importBackup(store, backup, mode(), await importOptions());
    }
    catch (problem) {
      console.error('Import failed:', problem);
      showError(STRINGS.failed);
      return;
    }
    finally {
      importing = false;
      locked.forEach((control) => {
        control.disabled = false;
      });
      if (result === null) {
        importButton.focus();
      }
    }
    if (watching) {
      showSync();
      importButton.focus();
      return;
    }
    close('import');
    toaster?.show(STRINGS.imported(name, result));
  }

  input.addEventListener('change', () => importing || onFile());
  for (const option of options) {
    option.input.addEventListener('change', () => importing || refreshCounts());
  }
  importButton.addEventListener('click', () => importing || (finished ? close('import') : onImport()));
  /**
   * Keep the dialog open while importing; registered before openDialog's listeners, it runs first.
   * @param {Event} event an Escape keydown or a cancel request
   */
  const hold = (event) => {
    if (importing && (event.type === 'cancel' || event.key === 'Escape')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  dialog.addEventListener('keydown', hold);
  dialog.addEventListener('cancel', hold);

  /** Cancel when the route changes or the viewport grows to the wide layout, unless the import is running. */
  const onRoute = () => {
    if (!importing) {
      close('cancel');
    }
  };
  const onResize = (event) => {
    if (!event.matches) {
      onRoute();
    }
  };
  // The covered main column stays out of reach of Tab and screen readers; it wakes before focus returns to the opener.
  const main = app?.querySelector('.app__main');
  const wake = () => {
    if (main) {
      main.inert = false;
    }
  };
  dialog.addEventListener('close', wake);

  return new Promise((resolve) => {
    close = openDialog(dialog, {
      opener,
      initialFocus: input,
      modal: !app,
      onClose() {
        request += 1;
        stopWatching();
        if (finished) {
          toaster?.show(STRINGS.imported(name, result));
        }
        doc.defaultView.removeEventListener('hashchange', onRoute);
        media?.removeEventListener('change', onResize);
        dialog.remove();
        resolve(result);
      },
    });
    if (app) {
      doc.defaultView.addEventListener('hashchange', onRoute);
      media.addEventListener('change', onResize);
      if (main) {
        main.inert = true;
      }
    }
  });
}
