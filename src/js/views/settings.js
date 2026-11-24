/**
 * Settings screen: Appearance, Adding tasks, Reminders, Data, Connection, Keyboard shortcuts, and About sections on one page.
 *
 * The theme choice applies at once and persists on this device (`todos.theme`).
 * The Make Enter add switch, on by default, sets whether Enter in the add field adds; it persists as `todos.enter-adds`,
 * which follows the account while connected (`SYN-13`), so a choice made on another device shows at once.
 * The Reminders switch is off by default; turning it on asks for notification permission, and a denial or missing
 * support leaves it off with the reason. The lead time persists as `todos.reminder-lead` (`REM-1` to `REM-3`).
 * Export backup saves the backup file at once and names it in a toast (`BAK-1`, `BAK-4`); Import backup opens its dialog.
 * In local mode the Connection section explains connected mode, and Connect opens the connect screen.
 * The server URL is kept per device and checked on change (`CON-12`); an empty field restores the default.
 * Connected, the section names the account, its server, the sync state, and a Sync log link; the URL cannot change (`CON-11`).
 * Delete all data erases this device after an offer to export first and a typed DELETE; connected, it also erases the account's data (`BAK-15`).
 * Disconnect asks first; with pending changes it offers Sync and disconnect (`CON-7`, `CON-10`, `TEC-18`).
 * While a connect waits on a local Delete all data, the section asks whether to erase the account too (`BAK-15`).
 * Keyboard shortcuts lists the shortcuts that work today, from `SHORTCUTS`.
 */

import { backupFileName, exportBackup } from '../core/backup.js';
import {
  DEFAULT_SERVER_URL, onSettingsChange, parseServerUrl, readEnterAdds, readReminderLead, readReminders, readServerUrl, readTheme,
  touchesSetting, writeEnterAdds, writeReminderLead, writeReminders, writeServerUrl, writeTheme,
} from '../core/preferences.js';
import { createSession } from '../sync/session.js';
import { confirmDialog } from '../../vendor/design/js/dialog.js';
import { applyTheme } from '../ui/layout.js';
import { BUILD_DATE, VERSION } from '../version.js';
import { openImportDialog, plural } from './import-dialog.js';
import { SYNC_STRINGS } from './sync-indicator.js';
import { spriteIcon } from './task-list.js';
import { make } from '../ui/dom.js';

/** Event on the window that tells the reminders of this tab that a Reminders choice changed. */
export const REMINDERS_EVENT = 'todos-reminders-changed';

const SOURCE_URL = 'https://github.com/gpellicciotta/todos.webapp';

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  appearance: 'Appearance',
  theme: 'Theme',
  themes: Object.freeze({ system: 'System', light: 'Light', dark: 'Dark' }),
  themeNotSaved: 'The theme could not be saved on this device. It applies until you reload.',
  adding: 'Adding tasks',
  enterAdds: 'Make Enter add',
  enterAddsHint: 'Shift+Enter and Alt+Enter always add. When this is off, Enter only searches.',
  enterAddsNotSaved: 'Make Enter add could not be saved on this device, so it stays as it was.',
  reminders: 'Reminders',
  remindersSwitch: 'Remind me when tasks come due',
  remindersHint: 'Notifies while ToDo\'s is open in a browser tab. A task with a date only reminds at 9:00 on that day.',
  remindWhen: 'Remind me',
  leadTime: (minutes) => (minutes === 0 ? 'When the task comes due' : `${minutes} minutes before`),
  remindersBlocked: 'Notifications are blocked for this site. Allow them in the browser settings, then turn reminders on again.',
  remindersUnsupported: 'This browser does not support notifications, so reminders cannot work.',
  remindersNotSaved: 'The reminder choice could not be saved on this device, so it stays as it was.',
  data: 'Data',
  exportBackup: 'Export backup',
  importBackup: 'Import backup',
  exported: (name, lists, tasks) => `Saved ${name} with ${plural(lists, 'list')} and ${plural(tasks, 'task')}.`,
  exportFailed: 'The backup could not be saved. Try again.',
  deleteAll: 'Delete all data',
  deleteAllConnectedText: (lists, tasks) => `This permanently erases ${plural(lists, 'list')}, ${plural(tasks, 'task')}, including any in the recycle bin, and their notes. It cannot be undone.`,
  deleteAllAccountText: 'This also erases them from your account on every device. People you share lists with lose those lists. You leave lists others share with you.',
  deleteAllSharedWithYou: (count) => `${plural(count, 'list')} shared with you stay with their owners.`,
  deleteAllTitle: 'Delete all data?',
  deleteAllText: (lists, tasks) => `This permanently erases ${plural(lists, 'list')}, ${plural(tasks, 'task')}, including any in the recycle bin, and their notes on this device. It cannot be undone.`,
  deleteAllExportHint: 'Export a backup first if you may want this data again.',
  deleteAllLabel: 'Type DELETE to confirm',
  deleteAllWord: 'DELETE',
  deleteEverything: 'Delete everything',
  deletedAll: 'All data deleted.',
  deleteAllOpenFailed: 'The data could not be counted, so nothing was deleted. Try again.',
  deleteAllFailed: 'The data could not be deleted, and nothing changed. Try again.',
  connection: 'Connection',
  localState: 'Not connected. Your data stays on this device.',
  gains: 'Connecting syncs your data across devices and lets you share lists.',
  cost: 'It needs an account, so you are no longer anonymous. Access is by invitation.',
  signIn: 'Sign in',
  working: 'Signing in…',
  notInvited: 'Access to ToDo\'s is by invitation only.',
  notInvitedHint: 'Ask someone who uses ToDo\'s to invite you. Your data stays on this device.',
  failed: 'Sign-in did not finish.',
  reasons: Object.freeze({
    network: 'The server could not be reached. Check the connection and try again.',
    'not-started': 'Start the sign-in from this section, then try again.',
    'state-mismatch': 'The sign-in did not come from this section. Start it again from here.',
    rejected: 'The server did not accept the sign-in. Try again.',
  }),
  signedIn: (account) => (account.name ? `Signed in as ${account.name} (${account.email})` : `Signed in as ${account.email}`),
  server: (url) => `Server: ${url}`,
  syncState: (label) => `Sync state: ${label}`,
  eraseQuestion: (date, email) => `You deleted all data on this device on ${date}. Also erase the lists and tasks of ${email} created before then?`,
  erase: 'Erase',
  keep: 'Keep',
  answerFailed: 'Your answer could not be saved. Try again.',
  syncLog: 'Sync log',
  expired: 'Your session expired. Your changes stay on this device until you sign in again.',
  signInAgain: 'Sign in again',
  disconnect: 'Disconnect',
  disconnectTitle: 'Disconnect from your account?',
  disconnectText: 'Your own lists and tasks stay on this device. Lists that others shared with you leave it.',
  pending: (count) => `${plural(count, 'change')} did not sync yet.`,
  syncAndDisconnect: 'Sync and disconnect',
  disconnectAnyway: 'Disconnect anyway',
  cancel: 'Cancel',
  deleteAccount: 'Delete account',
  deleteAccountTitle: 'Delete your account?',
  deleteAccountText: (email) => `This marks ${email} for deletion. The service erases the account later, with all its lists and tasks. This cannot be undone from the app.`,
  deleteAccountKeep: 'You stay signed out afterwards, and your own lists and tasks stay on this device.',
  deleteAccountLabel: 'Type the account email to confirm',
  deleteAccountMarked: 'Account marked for deletion. You are disconnected, and your data stays on this device.',
  deleteAccountFailed: 'The account could not be marked for deletion, so you are still connected. Try again.',
  disconnected: 'Disconnected. Your data stays on this device.',
  syncFailed: 'The changes could not sync, so you are still connected. Try again.',
  countFailed: 'The pending changes could not be counted, so you are still connected. Try again.',
  serverUrl: 'Server URL',
  serverUrlError: `Enter an https address, or http on this computer, such as ${DEFAULT_SERVER_URL}.`,
  about: 'About',
  version: (version, built) => `Version ${version} · Built ${built}`,
  source: 'Requirements and source code',
  shortcuts: 'Keyboard shortcuts',
  syntax: 'In the add field, today, tomorrow, a weekday, or 2026-12-24 sets the due date, '
    + '18:00 or 6 pm the time, and #home a list. A backslash keeps a word as text, such as \\tomorrow.',
  or: ' or ',
});

/**
 * The keyboard shortcuts the section lists: alternative keys, and what they do.
 * A task that adds a shortcut adds its row here.
 */
const SHORTCUTS = Object.freeze([
  Object.freeze({ keys: ['n', '/'], action: 'Focus the search and add field.' }),
  Object.freeze({ keys: ['l'], action: 'Focus the find field of the sidebar lists, or open Lists where there is none.' }),
  Object.freeze({ keys: ['/'], action: 'On the Lists screen, focus its find field.' }),
  Object.freeze({ keys: ['Enter'], action: 'Add the task, in the search and add field, while Make Enter add is on; otherwise apply the search.' }),
  Object.freeze({ keys: ['Shift+Enter', 'Alt+Enter'], action: 'Add the task or list, in the search and add field.' }),
  Object.freeze({ keys: ['Escape'], action: 'Clear the search and add field, or close the editor or a dialog.' }),
  Object.freeze({ keys: ['Alt+Up', 'Alt+Down'], action: "Move the focused list, or the focused task in a list's manual order." }),
  Object.freeze({
    keys: ['Alt+Home', 'Alt+End'],
    action: "Move the focused list, or the focused task in a list's manual order, to the top or bottom.",
  }),
  Object.freeze({ keys: ['x'], action: 'Tick the focused task, as a click on its status button does; a toast offers Undo.' }),
  Object.freeze({ keys: ['Ctrl+Z', 'Cmd+Z'], action: 'Undo the newest change shown in a toast.' }),
]);

/**
 * Create a settings section with its heading.
 * @param {Document} doc the document
 * @param {string} key the section key, used in identifiers
 * @param {string} title the heading text
 * @returns {HTMLElement} the section
 */
function section(doc, key, title) {
  const element = make(doc, 'section', 'settings__section');
  const heading = make(doc, 'h2', 'settings__title', title);
  heading.id = `settings-${key}`;
  element.setAttribute('aria-labelledby', heading.id);
  element.append(heading);
  return element;
}

/**
 * Create a button.
 * @param {Document} doc the document
 * @param {string} className the class
 * @param {string} text the label
 * @param {() => void} [onClick] the action
 * @returns {HTMLButtonElement} the button
 */
function button(doc, className, text, onClick) {
  const element = make(doc, 'button', className, text);
  element.type = 'button';
  if (onClick) {
    element.addEventListener('click', onClick);
  }
  return element;
}

/**
 * Format the day of a time in the device timezone, as in "4 Nov 2026" (`TEC-14`).
 * @param {string} iso the ISO time
 * @returns {string} the date
 */
function formatDay(iso) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

/**
 * Format the build date as in "4 Nov 2026".
 * @param {string} isoDate the ISO date
 * @returns {string} the date
 */
function formatBuildDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}

/**
 * Create the Appearance section: the theme as a segmented control that applies at once.
 * @param {Document} doc the document
 * @param {() => Storage} [getStorage] returns the storage of the preference
 * @param {{show: (message: string) => void}} [toaster] reports a theme that could not be saved
 * @returns {HTMLElement} the section
 */
function appearanceSection(doc, getStorage, toaster) {
  const element = section(doc, 'appearance', STRINGS.appearance);
  const fieldset = make(doc, 'fieldset', 'segmented');
  const options = make(doc, 'div', 'segmented__options');
  fieldset.append(make(doc, 'legend', 'visually-hidden', STRINGS.theme), options);
  const current = readTheme(getStorage);
  for (const [value, label] of Object.entries(STRINGS.themes)) {
    const option = make(doc, 'label', 'segmented__option');
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = value;
    input.checked = value === current;
    input.addEventListener('change', () => {
      applyTheme(doc, value);
      if (!writeTheme(value, getStorage)) {
        toaster?.show(STRINGS.themeNotSaved);
      }
    });
    option.append(input, doc.createTextNode(label));
    options.append(option);
  }
  element.append(fieldset);
  return element;
}

/**
 * Create the Adding tasks section: the Make Enter add switch, which applies at once and follows the account while connected.
 * @param {Document} doc the document
 * @param {() => Storage} [getStorage] returns the storage of the preference
 * @param {{show: (message: string) => void}} [toaster] reports a choice that could not be saved
 * @returns {{element: HTMLElement, destroy: () => void}} the section, and how to stop following downloaded choices
 */
function addingSection(doc, getStorage, toaster) {
  const element = section(doc, 'adding', STRINGS.adding);
  const label = make(doc, 'label', 'switch');
  const control = doc.createElement('input');
  control.className = 'switch__control';
  control.type = 'checkbox';
  control.setAttribute('role', 'switch');
  control.checked = readEnterAdds(getStorage);
  const hint = make(doc, 'p', 'settings__hint', STRINGS.enterAddsHint);
  hint.id = 'settings-enter-adds-hint';
  control.setAttribute('aria-describedby', hint.id);
  control.addEventListener('change', () => {
    if (!writeEnterAdds(control.checked, getStorage)) {
      control.checked = !control.checked;
      toaster?.show(STRINGS.enterAddsNotSaved);
    }
  });
  // A choice downloaded from the account, or made in another tab, shows at once (`SYN-13`); closing the screen stops following.
  const stop = onSettingsChange((names) => {
    if (touchesSetting(names, 'todos.enter-adds')) {
      control.checked = readEnterAdds(getStorage);
    }
  });
  label.append(control, doc.createTextNode(STRINGS.enterAdds));
  element.append(label, hint);
  return { element, destroy: stop };
}

/**
 * Create the Reminders section: an opt-in switch that asks for notification permission, and the lead time.
 * @param {Document} doc the document
 * @param {() => Storage} [getStorage] returns the storage of the preferences
 * @param {{show: (message: string) => void}} [toaster] reports a choice that could not be saved
 * @param {{permission: string, requestPermission: () => Promise<string>}|null} notification the Notification API, or null
 * @param {() => number} now the clock in Unix milliseconds
 * @returns {HTMLElement} the section
 */
function remindersSection(doc, getStorage, toaster, notification, now) {
  const element = section(doc, 'reminders', STRINGS.reminders);
  const label = make(doc, 'label', 'switch');
  const control = doc.createElement('input');
  control.className = 'switch__control';
  control.type = 'checkbox';
  control.setAttribute('role', 'switch');
  control.dataset.reminders = 'switch';
  const hint = make(doc, 'p', 'settings__hint', STRINGS.remindersHint);
  hint.id = 'settings-reminders-hint';
  control.setAttribute('aria-describedby', hint.id);
  label.append(control, doc.createTextNode(STRINGS.remindersSwitch));

  const lead = doc.createElement('select');
  lead.className = 'field__control';
  lead.dataset.reminders = 'lead';
  lead.id = 'settings-reminder-lead';
  for (const minutes of [0, 5, 15, 30, 60]) {
    const option = doc.createElement('option');
    option.value = String(minutes);
    option.textContent = STRINGS.leadTime(minutes);
    lead.append(option);
  }
  lead.value = String(readReminderLead(getStorage));
  const leadLabel = make(doc, 'label', 'field__label', STRINGS.remindWhen);
  leadLabel.htmlFor = lead.id;
  const problem = make(doc, 'p', 'settings__hint');
  problem.dataset.reminders = 'problem';
  problem.setAttribute('role', 'status');
  problem.hidden = true;

  const showProblem = (text) => {
    problem.textContent = text ?? '';
    problem.hidden = !text;
  };
  const sync = () => {
    lead.disabled = !control.checked;
    doc.defaultView?.dispatchEvent(new Event(REMINDERS_EVENT));
  };
  control.checked = Boolean(notification) && notification.permission === 'granted' && readReminders(getStorage);
  if (!notification) {
    control.disabled = true;
    showProblem(STRINGS.remindersUnsupported);
  }
  else if (notification.permission === 'denied') {
    showProblem(STRINGS.remindersBlocked);
  }
  sync();

  control.addEventListener('change', async () => {
    showProblem(null);
    if (!control.checked) {
      if (!writeReminders(false, getStorage)) {
        control.checked = true;
        toaster?.show(STRINGS.remindersNotSaved);
      }
      sync();
      return;
    }
    control.checked = false;
    let permission = notification.permission;
    if (permission !== 'granted') {
      try {
        permission = await notification.requestPermission();
      }
      catch {
        permission = 'denied';
      }
    }
    if (permission !== 'granted') {
      showProblem(STRINGS.remindersBlocked);
      sync();
      return;
    }
    if (writeReminders(true, getStorage, now())) {
      control.checked = true;
    }
    else {
      toaster?.show(STRINGS.remindersNotSaved);
    }
    sync();
  });
  lead.addEventListener('change', () => {
    if (!writeReminderLead(Number(lead.value), getStorage)) {
      lead.value = String(readReminderLead(getStorage));
      toaster?.show(STRINGS.remindersNotSaved);
    }
  });
  const field = make(doc, 'div', 'field');
  field.append(leadLabel, lead);
  element.append(label, hint, field, problem);
  return element;
}

/**
 * Save the backup of every stored record as `todos-backup-{{yyyy-mm-dd}}.json`, then name it in a toast.
 * @param {Document} doc the document
 * @param {object} store the store facade
 * @param {{show: (message: string) => void}} [toaster] shows the confirmation
 * @returns {Promise<void>}
 */
async function saveBackup(doc, store, toaster) {
  const now = new Date();
  const backup = await exportBackup(store, { now, appVersion: VERSION });
  const name = backupFileName(now);
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = make(doc, 'a', 'visually-hidden');
  link.href = url;
  link.download = name;
  doc.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toaster?.show(STRINGS.exported(name, backup.lists.length, backup.tasks.length));
}

/**
 * Ask before erasing all data: counts, an Export backup button, and a field that must hold DELETE.
 * The dialog stays open when erasing fails, so the user can try again.
 * @param {Document} doc the document
 * @param {HTMLElement} parent the element that holds the dialog while open
 * @param {HTMLElement} opener the Delete all data button
 * @param {object} store the store facade
 * @param {{show: (message: string) => void}} [toaster] shows the confirmations
 * @param {{state: () => string, subscribe: Function}} [session] the session; the dialog closes when it leaves local mode
 * @returns {Promise<void>}
 */
async function askDeleteAll(doc, parent, opener, store, toaster, session) {
  const isLocal = () => (session?.state() ?? 'local') === 'local';
  const startedLocal = isLocal();
  const snapshot = await store.snapshot();
  const userId = startedLocal ? null : await store.queue?.getState?.('user-id') ?? null;
  // Connected, the erase takes only what the user owns; lists and tasks of others stay with them.
  const lists = startedLocal ? snapshot.lists : snapshot.lists.filter((list) => (list.role ?? 'owner') === 'owner');
  const tasks = startedLocal ? snapshot.tasks : snapshot.tasks.filter((task) => {
    const owner = task['owner-id'];
    return userId === null || owner === null || owner === undefined || String(owner) === String(userId);
  });
  const sharedWithUser = snapshot.lists.length - lists.length;
  const dialog = make(doc, 'dialog', 'dialog');
  dialog.setAttribute('aria-labelledby', 'settings-delete-all-title');
  const header = make(doc, 'div', 'dialog__header');
  const title = make(doc, 'h2', 'dialog__title', STRINGS.deleteAllTitle);
  title.id = 'settings-delete-all-title';
  header.append(title);
  const body = make(doc, 'div', 'dialog__body settings__delete-all');
  const exportButton = button(doc, 'button button--secondary', STRINGS.exportBackup, async () => {
    exportButton.disabled = true;
    try {
      await saveBackup(doc, store, toaster);
    }
    catch (error) {
      console.error('Export failed:', error);
      toaster?.show(STRINGS.exportFailed);
    }
    finally {
      exportButton.disabled = false;
    }
  });
  const field = make(doc, 'div', 'field');
  const label = make(doc, 'label', 'field__label', STRINGS.deleteAllLabel);
  label.htmlFor = 'settings-delete-all-word';
  const input = make(doc, 'input', 'field__control');
  Object.assign(input, { id: label.htmlFor, type: 'text', autocomplete: 'off', spellcheck: false });
  field.append(label, input);
  body.append(make(doc, 'p', '', startedLocal
    ? STRINGS.deleteAllText(lists.length, tasks.length)
    : `${STRINGS.deleteAllConnectedText(lists.length, tasks.length)} ${STRINGS.deleteAllAccountText}`));
  if (sharedWithUser > 0) {
    body.append(make(doc, 'p', '', STRINGS.deleteAllSharedWithYou(sharedWithUser)));
  }
  body.append(make(doc, 'p', 'settings__hint', STRINGS.deleteAllExportHint), exportButton, field);
  const actions = make(doc, 'div', 'dialog__actions');
  const cancel = button(doc, 'button button--secondary', STRINGS.cancel);
  cancel.dataset.dialogClose = 'cancel';
  const confirm = button(doc, 'button button--danger', STRINGS.deleteEverything);
  confirm.disabled = true;
  let busy = false;
  const typedWord = () => input.value === STRINGS.deleteAllWord;
  input.addEventListener('input', () => {
    confirm.disabled = busy || !typedWord();
  });
  actions.append(cancel, confirm);
  dialog.append(header, body, actions);
  parent.append(dialog);
  const closed = confirmDialog(dialog, { opener, initialFocus: input });
  // Connecting or disconnecting while the dialog is open ends the offer: its text and counts no longer match what an erase does.
  const stop = session?.subscribe?.(() => {
    if (isLocal() !== startedLocal && !busy) {
      dialog.close('cancel');
    }
  });
  confirm.addEventListener('click', async () => {
    if (busy || !typedWord() || isLocal() !== startedLocal) {
      return;
    }
    busy = true;
    for (const control of [confirm, input, cancel]) {
      control.disabled = true;
    }
    try {
      await store.deleteAllData();
    }
    catch (error) {
      console.error('Deleting all data failed:', error);
      toaster?.show(STRINGS.deleteAllFailed);
      busy = false;
      for (const control of [input, cancel]) {
        control.disabled = false;
      }
      confirm.disabled = !typedWord();
      (confirm.disabled ? input : confirm).focus();
      return;
    }
    toaster?.show(STRINGS.deletedAll);
    dialog.close('delete');
  });
  await closed;
  stop?.();
  dialog.remove();
}

/**
 * Create the Data section: Export backup, Import backup, and Delete all data.
 * Delete all data is on in every mode; connected, it also erases the account's data through the queue.
 * @param {Document} doc the document
 * @param {object} store the store facade
 * @param {{show: (message: string) => void}} [toaster] shows the confirmations
 * @param {{session: object, sync?: object}} [connection] the session and the sync engine, for importing while connected
 * @returns {{element: HTMLElement, destroy: () => void}} the section
 */
function dataSection(doc, store, toaster, connection = {}) {
  const element = section(doc, 'data', STRINGS.data);
  const actions = make(doc, 'div', 'settings__actions');
  const exportButton = make(doc, 'button', 'button button--secondary', STRINGS.exportBackup);
  exportButton.type = 'button';
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    try {
      await saveBackup(doc, store, toaster);
    }
    catch (error) {
      console.error('Export failed:', error);
      toaster?.show(STRINGS.exportFailed);
    }
    finally {
      exportButton.disabled = false;
    }
  });
  const importButton = make(doc, 'button', 'button button--secondary', STRINGS.importBackup);
  importButton.type = 'button';
  importButton.addEventListener('click', () => openImportDialog(doc, { store, toaster, opener: importButton, ...connection }));
  let opening = false;
  const deleteButton = button(doc, 'button button--secondary button--danger', STRINGS.deleteAll, async () => {
    if (opening) {
      return;
    }
    opening = true;
    try {
      await askDeleteAll(doc, element, deleteButton, store, toaster, connection.session);
    }
    catch (error) {
      console.error('Opening Delete all data failed:', error);
      toaster?.show(STRINGS.deleteAllOpenFailed);
    }
    finally {
      opening = false;
    }
  });
  actions.append(exportButton, importButton, deleteButton);
  element.append(actions);
  return { element, destroy: () => {} };
}

/**
 * Create the server URL field of local mode.
 * @param {Document} doc the document
 * @param {() => Storage} [getStorage] returns the storage of the preference
 * @returns {HTMLElement} the field
 */
function serverField(doc, getStorage) {
  const field = make(doc, 'div', 'field');
  const label = make(doc, 'label', 'field__label', STRINGS.serverUrl);
  label.htmlFor = 'settings-server-url';
  const input = make(doc, 'input', 'field__control');
  Object.assign(input, { id: label.htmlFor, type: 'url', autocomplete: 'url', spellcheck: false, value: readServerUrl(getStorage) });
  const error = make(doc, 'p', 'field__error');
  error.id = 'settings-server-url-error';
  error.hidden = true;
  error.append(spriteIcon(doc, 'alert'), doc.createTextNode(STRINGS.serverUrlError));
  input.addEventListener('change', () => {
    const text = input.value.trim() || DEFAULT_SERVER_URL;
    const url = parseServerUrl(text);
    error.hidden = url !== null;
    if (url === null) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', error.id);
      return;
    }
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    input.value = url;
    writeServerUrl(url, getStorage);
  });
  field.append(label, input, error);
  return field;
}

/**
 * Ask before disconnecting; with pending changes, offer to sync first.
 * @param {Document} doc the document
 * @param {HTMLElement} parent the element that holds the dialog while open
 * @param {HTMLElement} opener the Disconnect button
 * @param {number} pending the count of changes not synced yet
 * @returns {Promise<'sync'|'disconnect'|null>} the choice, or null for Cancel
 */
async function askDisconnect(doc, parent, opener, pending) {
  const dialog = make(doc, 'dialog', 'dialog');
  dialog.setAttribute('aria-labelledby', 'settings-disconnect-title');
  const header = make(doc, 'div', 'dialog__header');
  const title = make(doc, 'h2', 'dialog__title', STRINGS.disconnectTitle);
  title.id = 'settings-disconnect-title';
  header.append(title);
  const body = make(doc, 'div', 'dialog__body');
  body.append(make(doc, 'p', '', STRINGS.disconnectText));
  const actions = make(doc, 'div', 'dialog__actions');
  const choices = [['button--secondary', STRINGS.cancel, 'cancel']];
  if (pending > 0) {
    body.append(make(doc, 'p', '', STRINGS.pending(pending)));
    choices.push(['button--secondary', STRINGS.disconnectAnyway, 'disconnect'], ['', STRINGS.syncAndDisconnect, 'sync']);
  }
  else {
    choices.push(['', STRINGS.disconnect, 'disconnect']);
  }
  for (const [variant, text, value] of choices) {
    const choice = button(doc, `button ${variant}`.trim(), text);
    choice.dataset.dialogClose = value;
    actions.append(choice);
  }
  dialog.append(header, body, actions);
  parent.append(dialog);
  await confirmDialog(dialog, { opener });
  const answer = dialog.returnValue;
  dialog.remove();
  return answer === 'sync' || answer === 'disconnect' ? answer : null;
}

/**
 * Ask before marking the account for deletion; the confirm button needs the account email typed.
 * The dialog stays open when the request fails, so the user can try again.
 * @param {Document} doc the document
 * @param {HTMLElement} parent the element that holds the dialog while open
 * @param {HTMLElement} opener the Delete account button
 * @param {string} email the account email
 * @param {() => Promise<void>} mark marks the account and disconnects; rejects when that fails
 * @param {{show: (message: string) => void}} [toaster] shows the problems
 * @returns {Promise<void>}
 */
async function askDeleteAccount(doc, parent, opener, email, mark, toaster) {
  const dialog = make(doc, 'dialog', 'dialog');
  dialog.setAttribute('aria-labelledby', 'settings-delete-account-title');
  const header = make(doc, 'div', 'dialog__header');
  const title = make(doc, 'h2', 'dialog__title', STRINGS.deleteAccountTitle);
  title.id = 'settings-delete-account-title';
  header.append(title);
  const body = make(doc, 'div', 'dialog__body settings__delete-all');
  const field = make(doc, 'div', 'field');
  const label = make(doc, 'label', 'field__label', STRINGS.deleteAccountLabel);
  label.htmlFor = 'settings-delete-account-email';
  const input = make(doc, 'input', 'field__control');
  Object.assign(input, { id: label.htmlFor, type: 'text', autocomplete: 'off', spellcheck: false });
  field.append(label, input);
  body.append(make(doc, 'p', '', STRINGS.deleteAccountText(email)), make(doc, 'p', 'settings__hint', STRINGS.deleteAccountKeep), field);
  const actions = make(doc, 'div', 'dialog__actions');
  const cancel = button(doc, 'button button--secondary', STRINGS.cancel);
  cancel.dataset.dialogClose = 'cancel';
  const confirm = button(doc, 'button button--danger', STRINGS.deleteAccount);
  confirm.disabled = true;
  let busy = false;
  const typed = () => input.value === email;
  input.addEventListener('input', () => {
    confirm.disabled = busy || !typed();
  });
  actions.append(cancel, confirm);
  dialog.append(header, body, actions);
  parent.append(dialog);
  const closed = confirmDialog(dialog, { opener, initialFocus: input });
  confirm.addEventListener('click', async () => {
    if (busy || !typed()) {
      return;
    }
    busy = true;
    for (const control of [confirm, input, cancel]) {
      control.disabled = true;
    }
    try {
      await mark();
    }
    catch (error) {
      console.error('Marking the account for deletion failed:', error);
      toaster?.show(STRINGS.deleteAccountFailed);
      busy = false;
      for (const control of [input, cancel]) {
        control.disabled = false;
      }
      confirm.disabled = !typed();
      (confirm.disabled ? input : confirm).focus();
      return;
    }
    toaster?.show(STRINGS.deleteAccountMarked);
    dialog.close('delete');
  });
  await closed;
  dialog.remove();
}

/**
 * Fill the Connection section for the session state, and refill it when the state changes.
 * @param {Document} doc the document
 * @param {object} options the session, the sync hook, the preference storage, the toaster, and `navigate`
 * @returns {{element: HTMLElement, destroy: () => void}} the section
 */
function connectionSection(doc, { getStorage, session, sync, toaster, assign, store, api }) {
  const element = section(doc, 'connection', STRINGS.connection);
  const heading = element.firstChild;
  heading.tabIndex = -1;
  // The polite live region stays in place, so each phase message is announced once as its text changes.
  const live = make(doc, 'div', 'settings__live');
  live.setAttribute('aria-live', 'polite');
  // Render replaces the body only, so the heading keeps the focus the #/connect route gave it.
  const body = make(doc, 'div', 'settings__body');
  element.append(live, body);
  let alive = true;
  /** The sign-in phase that overrides the session state: `working`, `not-invited`, `error`, or null. */
  let phase = null;
  let reason = null;

  /** Send the browser to Auth, after remembering the sign-in on this device. */
  function signIn() {
    const win = doc.defaultView;
    const returnUrl = new URL('#/connect', win.location.href).href;
    const logoUrl = new URL('img/todos-icon-192.png', win.location.href).href;
    (assign ?? ((url) => win.location.assign(url)))(session.start({ returnUrl, logoUrl }));
  }

  /**
   * Create a status line with an icon.
   * @param {'check'|'alert'} icon the icon
   * @param {string} text the text
   * @param {boolean} [isError] whether the line shows a problem
   * @returns {HTMLElement} the line
   */
  function status(icon, text, isError = false) {
    const line = make(doc, 'p', `settings__text connect__status${isError ? ' connect__status--error' : ''}`);
    line.append(spriteIcon(doc, icon), doc.createTextNode(text));
    return line;
  }

  /**
   * Ask, optionally sync, then disconnect.
   * @param {HTMLElement} opener the Disconnect button
   * @returns {Promise<void>}
   */
  async function disconnect(opener) {
    let pending;
    try {
      pending = (await sync?.pendingCount()) ?? 0;
    }
    catch (error) {
      console.error('Counting pending changes failed:', error);
      toaster?.show(STRINGS.countFailed);
      return;
    }
    const choice = await askDisconnect(doc, element, opener, pending);
    try {
      if (choice === 'sync') {
        await sync.syncNow();
      }
      if (choice) {
        await session.disconnect();
        toaster?.show(STRINGS.disconnected);
      }
    }
    catch (error) {
      console.error('Sync before disconnect failed:', error);
      toaster?.show(STRINGS.syncFailed);
    }
  }

  /**
   * Ask, mark the account for deletion on the service, then disconnect as Disconnect does.
   * @param {HTMLElement} opener the Delete account button
   * @returns {Promise<void>}
   */
  async function deleteAccount(opener) {
    const email = session.account()?.email ?? '';
    await askDeleteAccount(doc, element, opener, email, async () => {
      const userId = await store.queue.getState('user-id');
      if (userId === null || userId === undefined) {
        throw new Error('The user ID is not known yet');
      }
      const reply = await api.markAccountDeleted(userId);
      if (!reply.ok) {
        throw new Error(`The service answered ${reply.status}`);
      }
      await session.disconnect();
    }, toaster);
  }

  /**
   * Answer the erase question of a connect (`BAK-15`): Erase names the connected account in the pending erase,
   * so the engine erases it before adoption; Keep drops the pending erase. Either way syncing resumes.
   * @param {boolean} erase true for Erase
   * @param {HTMLButtonElement[]} controls the answer buttons, off while the answer is saved
   * @returns {Promise<void>}
   */
  async function answerErase(erase, controls) {
    controls.forEach((control) => {
      control.disabled = true;
    });
    try {
      const pending = await store.queue.getState('pending-erase');
      if (pending) {
        const { email, server } = session.account();
        await store.queue.setState('pending-erase', erase ? { ...pending, account: { email, server } } : null);
      }
    }
    catch (error) {
      console.error('Saving the erase answer failed:', error);
      toaster?.show(STRINGS.answerFailed);
      controls.forEach((control) => {
        control.disabled = false;
      });
      return;
    }
    try {
      await sync?.syncNow?.();
    }
    catch (error) {
      console.error('Sync after the erase answer failed:', error);
    }
  }

  /**
   * Create the status line and hint of a failed sign-in.
   * @returns {HTMLElement[]} the lines
   */
  function failureParts() {
    return phase === 'not-invited'
      ? [status('alert', STRINGS.notInvited, true), make(doc, 'p', 'settings__hint connect__hint--error', STRINGS.notInvitedHint)]
      : [status('alert', STRINGS.failed, true), make(doc, 'p', 'settings__hint connect__hint--error', STRINGS.reasons[reason] ?? STRINGS.reasons.rejected)];
  }

  /** Show the controls of the current state. */
  function render() {
    const state = session.state();
    const account = session.account();
    const actions = make(doc, 'div', 'settings__actions');
    const justFinished = phase !== 'working' && live.dataset.phase === 'working';
    // The sign-in phase lasts until its promise settles, whatever the session notifies meanwhile: `save()` notifies
    // a connected state before the code exchange resolves, and an expired session stays expired while a return fails.
    if (phase === 'working') {
      live.dataset.phase = 'working';
      live.replaceChildren(make(doc, 'p', 'settings__text', STRINGS.working));
      body.replaceChildren();
      return;
    }
    if (state === 'local') {
      const parts = phase === 'not-invited' || phase === 'error'
        ? failureParts()
        : [make(doc, 'p', 'settings__text', STRINGS.localState), make(doc, 'p', 'settings__text', STRINGS.gains), make(doc, 'p', 'settings__text', STRINGS.cost)];
      live.dataset.phase = phase ?? 'intro';
      live.replaceChildren(...parts);
      actions.append(button(doc, 'button', STRINGS.signIn, signIn));
      body.replaceChildren(make(doc, 'p', 'settings__hint', STRINGS.server(session.serverUrl())), actions, serverField(doc, getStorage));
      if (justFinished) {
        actions.firstElementChild.focus();
      }
      return;
    }
    const syncState = sync?.state?.();
    const syncStatus = syncState?.status;
    const failure = phase === 'not-invited' || phase === 'error';
    // The engine waits on this question before it uploads anything for a newly connected account.
    const question = state === 'connected' && syncStatus === 'question' && syncState.erase && store?.queue ? syncState.erase : null;
    live.dataset.phase = failure ? phase : state === 'sign-in-needed' ? 'expired' : 'signed-in';
    if (failure) {
      live.replaceChildren(...failureParts());
    }
    else {
      live.replaceChildren(state === 'sign-in-needed' ? make(doc, 'p', 'settings__text', STRINGS.expired) : status('check', STRINGS.signedIn(account)));
    }
    const parts = [];
    if (question) {
      live.append(make(doc, 'p', 'settings__text settings__question', STRINGS.eraseQuestion(formatDay(question.time), account.email)));
      const answers = make(doc, 'div', 'settings__actions');
      const keep = button(doc, 'button button--secondary', STRINGS.keep, () => answerErase(false, [keep, erase]));
      const erase = button(doc, 'button button--danger', STRINGS.erase, () => answerErase(true, [keep, erase]));
      answers.append(keep, erase);
      parts.push(answers);
    }
    if (state === 'sign-in-needed') {
      parts.push(make(doc, 'p', 'settings__text', STRINGS.signedIn(account)));
      actions.append(button(doc, 'button', STRINGS.signInAgain, signIn));
    }
    parts.push(make(doc, 'p', 'settings__hint', STRINGS.server(account.server)));
    if (syncStatus) {
      parts.push(make(doc, 'p', 'settings__hint settings__sync-state', STRINGS.syncState(SYNC_STRINGS.labels[state === 'sign-in-needed' ? 'sign-in-needed' : syncStatus] ?? syncStatus)));
    }
    const leave = button(doc, 'button button--secondary', STRINGS.disconnect, () => disconnect(leave));
    const log = make(doc, 'a', 'button button--secondary', STRINGS.syncLog);
    log.href = '#/settings/sync-log';
    actions.append(log, leave);
    if (state === 'connected' && store && api) {
      actions.append(button(doc, 'button button--danger', STRINGS.deleteAccount, (event) => deleteAccount(event.currentTarget)));
    }
    body.replaceChildren(...parts, actions);
    if (justFinished) {
      body.querySelector('.settings__actions').firstElementChild.focus();
    }
  }

  /**
   * Finish an Auth return captured by the shell, showing Signing in until the sign-in settles.
   * @returns {void}
   */
  function finishReturn() {
    const finishing = session.finish?.();
    if (!finishing) {
      return;
    }
    phase = 'working';
    finishing.then(() => {
      phase = null;
    }, (error) => {
      if (error?.name !== 'AuthError') {
        console.error('Sign-in failed:', error);
      }
      phase = error?.reason === 'not-invited' ? 'not-invited' : 'error';
      reason = error?.reason;
    }).then(() => {
      if (alive) {
        render();
      }
    });
  }

  finishReturn();
  render();
  const stops = [session.subscribe(render), sync?.subscribe?.(render)];
  return {
    element,
    heading,
    destroy() {
      alive = false;
      stops.forEach((stop) => stop?.());
    },
  };
}

/**
 * Create the Keyboard shortcuts section: one term per shortcut, its keys in `kbd` elements joined by "or".
 * @param {Document} doc the document
 * @returns {HTMLElement} the section
 */
function shortcutsSection(doc) {
  const element = section(doc, 'shortcuts', STRINGS.shortcuts);
  element.classList.add('settings__keyboard');
  const list = make(doc, 'dl', 'settings__shortcuts');
  for (const { keys, action } of SHORTCUTS) {
    const term = doc.createElement('dt');
    keys.forEach((key, index) => {
      if (index > 0) {
        term.append(STRINGS.or);
      }
      const kbd = doc.createElement('kbd');
      kbd.textContent = key;
      term.append(kbd);
    });
    const row = doc.createElement('div');
    row.append(term, make(doc, 'dd', 'settings__shortcut-action', action));
    list.append(row);
  }
  element.append(list);
  return element;
}

/**
 * Create the About section: the app version, the build date, the add field syntax (`TSK-14`), and the source link.
 * @param {Document} doc the document
 * @returns {HTMLElement} the section
 */
function aboutSection(doc) {
  const element = section(doc, 'about', STRINGS.about);
  const link = make(doc, 'a', 'settings__link', STRINGS.source);
  link.href = SOURCE_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  element.append(make(doc, 'p', 'settings__hint', STRINGS.version(VERSION, formatBuildDate(BUILD_DATE))),
    make(doc, 'p', 'settings__hint settings__syntax', STRINGS.syntax), link);
  return element;
}

/**
 * Mount the Settings screen into its view element.
 * @param {HTMLElement} view the `[data-view="settings"]` element
 * @param {object} [options] screen options
 * @param {() => Storage} [options.getStorage] returns the storage of the per-device preferences
 * @param {object} [options.store] the store facade, for the backups
 * @param {{show: (message: string) => void}} [options.toaster] shows confirmations and problems
 * @param {object} [options.session] the session, for the Connection section
 * @param {{pendingCount: () => Promise<number>, syncNow: () => Promise<void>, state: () => object, subscribe: Function}} [options.sync] the sync engine
 * @param {(hash: string, settings?: {replace?: boolean}) => void} [options.navigate] opens a route, setting the location hash by default
 * @param {{markAccountDeleted: (userId: number|string) => Promise<{ok: boolean, status: number}>}} [options.api] the API client, for Delete account
 * @param {(url: string) => void} [options.assign] opens the Auth URL, `location.assign` by default
 * @param {{permission: string, requestPermission: () => Promise<string>}|null} [options.notification] the Notification API, which `globalThis.Notification` supplies by default
 * @param {() => number} [options.now] the clock in Unix milliseconds
 * @returns {{update: (route?: object) => void, destroy: () => void}} the screen
 */
export function mountSettings(view, {
  getStorage, store, toaster, session = createSession({ getStorage }), sync, assign, api,
  notification = globalThis.Notification ?? null, now = Date.now, navigate = (hash, { replace = false } = {}) => {
    const { location } = view.ownerDocument.defaultView;
    if (replace) {
      location.replace(hash);
    }
    else {
      location.hash = hash;
    }
  },
} = {}) {
  const doc = view.ownerDocument;
  const root = make(doc, 'div', 'settings');
  const connection = connectionSection(doc, { getStorage, session, sync, toaster, assign, store, api });
  const data = dataSection(doc, store, toaster, { session, sync });
  const adding = addingSection(doc, getStorage, toaster);
  root.append(appearanceSection(doc, getStorage, toaster), adding.element, remindersSection(doc, getStorage, toaster, notification, now), data.element, connection.element, shortcutsSection(doc), aboutSection(doc));
  view.replaceChildren(root);
  return {
    /**
     * Follow a route of this view. `#/connect`, the Auth return alias, scrolls the Connection section into view,
     * focuses its heading, and replaces the address with `#/settings`, so Back never returns to the alias.
     * @param {{name?: string}} [route] the route
     */
    update(route) {
      if (route?.name === 'connect') {
        navigate('#/settings', { replace: true });
        // The router restores the scroll position and the shell focuses the main area once this route renders; go after both.
        setTimeout(() => {
          connection.element.scrollIntoView?.({ block: 'start' });
          connection.heading.focus({ preventScroll: true });
        }, 0);
      }
    },

    /** Stop following the session; the controls go with the view. */
    destroy() {
      adding.destroy();
      connection.destroy();
      data.destroy();
    },
  };
}
