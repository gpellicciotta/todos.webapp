/**
 * Task editor: every field of one task, saved on change, with no Save button.
 *
 * Three tabs under the header split the sections, with the vendored tabs.js; each open starts on Content.
 * Content: description (`TSK-1`) and notes (`NOT-1` to `NOT-6`), whose add field also searches them.
 * Status, with a rule between each part: status (`TSK-3`, `TSK-4`), then lists (`TSK-8`), then target count (`TSK-15`),
 * due date and time (`TSK-5`, `TSK-6`), overdue behavior once a due time is set (`TSK-7`), and repeat (`TSK-16`),
 * then Delete task (`TSK-11`) after a last rule. History: history (`TSK-17`), which loads when its tab first shows,
 * then details (`TSK-12`). A field error on a hidden tab, such as a late validation failure, selects that tab.
 * The status section names the status, with the done and target counts above target 1, and offers one state button per
 * status, posting the events of `eventsTowardsStatus`. Above target 1 the counts gate Completed and In progress,
 * and a stepper adds or undoes completions. For 24 hours after a period ends, a button completes that period.
 * Target count, deadline, and overdue behavior edit the lifecycle rules; a recurring task has no deadline to edit.
 * Repeat makes the task recurring daily, weekly, or monthly in the browser's timezone; a recurring task then shows its
 * interval, end date, end count, and timezone, and Never stops the recurrence. Past its period end, the status shows
 * the display rule's `ready` with count 0 until the roll-over. History lists the occurrences and events on request.
 * An invalid value shows a field error and saves nothing.
 * A deleted task opens read-only with a Restore banner (`BIN-6`); an unknown task closes with a toast.
 * A viewer sees every field read-only under a banner naming the list owner, and only the task owner or the owner of a
 * list holding the task may delete it; the lists offered follow the roles (`SHR-4`, `SHR-5`).
 * Store changes, also from other tabs, fill the fields again, except a focused or invalid one;
 * a focused field left unchanged then shows the newest value. The due date and time save once focus leaves them,
 * since a date field changes on each typed digit, such as year 0202 on the way to 2026.
 * Once loaded, the editor focuses the description, except while the add field holds the focus on a wide screen:
 * there the panel sits beside the rows, so the user keeps typing the next task (`TSK-13`).
 */

import { displayTask, eventsTowardsStatus, graceOccurrence, isRecurring, overdueHandlingOf } from '../core/occurrences.js';
import { browserTimezone, isValidTimezone } from '../core/periods.js';
import { can, canTrashTask, listRole, taskRole } from '../core/permissions.js';

import { DESCRIPTION_MAX } from '../store/tasks.js';
import { attachTabs } from '../../vendor/design/js/tabs.js';
import { createEditorField } from './editor-panel.js';
import { createTaskHistory, readServerOccurrences } from './task-history.js';
import { createNoteThread } from './notes.js';
import { countWords, make as el, showsCount, spriteIcon, STATUS_LABELS } from './task-list.js';

/** Editor strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  title: 'Task', sections: 'Task sections', content: 'Content', description: 'Description', status: 'Status', target: 'Target count',
  targetHint: 'How many times to do the task before it is completed.',
  targetRange: 'Enter a whole number from 1 to 999.',
  reachTarget: (target) => `Reach ${target} of ${target} to complete`,
  belowTarget: (target) => `Step below ${target} of ${target} to be in progress`,
  completions: 'Completions', stepDown: 'Undo a completion', stepUp: 'Add a completion',
  count: (done, target) => `${done} of ${target}`,
  previousPeriod: (day) => `Complete for previous period (${day})`,
  due: 'Due', dueDate: 'Due date', dueTime: 'Due time',
  clear: 'Clear', clearLabel: 'Clear the due date', overdue: 'Overdue behavior',
  keep: 'Keep open', cancel: 'Cancel when overdue', lists: 'Lists',
  addToList: 'Add to list', createList: (name) => `Create list "${name}"`,
  removeFrom: 'Remove from ', notes: 'Notes', details: 'Details', created: 'Created ',
  updated: 'Last updated ', delete: 'Delete task',
  deleted: 'Task moved to the recycle bin.', inBin: 'This task is in the recycle bin.',
  restore: 'Restore', readOnly: (owner) => `You can only view this task${owner ? `. Its list owner is ${owner}` : ''}.`, notFound: 'That task was not found.', failed: 'That change could not be saved.',
  required: 'Enter a description.', tooLong: `A description holds at most ${DESCRIPTION_MAX} characters.`,
  dateFirst: 'Enter a date to set a time.', fullYear: 'Enter a four-digit year.',
  repeat: 'Repeat', never: 'Never', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', interval: 'Every',
  intervalHint: 'How many days, weeks, or months each period spans.', intervalRange: 'Enter a whole number from 1 to 99.',
  endDate: 'Ends on', endDateHint: 'No period starts after this date.', endCount: 'Ends after',
  endCountHint: 'The number of periods, whatever their outcome.', endCountRange: 'Enter a whole number of at least 1, or leave it empty.',
  timezone: 'Timezone', timezoneHint: 'Periods start at midnight in this timezone.', timezoneInvalid: 'Enter a timezone such as Europe/Brussels.',
  history: 'History',
});

let instances = 0;

/** The statuses of the state buttons, in order. */
const STATES = Object.freeze(['ready', 'in-progress', 'completed', 'cancelled']);

/** The highest target count the editor takes; the service stores up to 32767, but no task needs that many. */
const TARGET_MAX = 999;

/** Below 64rem the editor panel covers the main column, add field included. */
const COMPACT = '(width < 64rem)';

/**
 * Tell whether the add field keeps the focus: it has it, and the editor opens beside it rather than over it.
 * @param {Document} doc the document
 * @returns {boolean} true to leave the focus in the add field
 */
function addFieldKeepsFocus(doc) {
  return Boolean(doc.activeElement?.matches('[data-shortcut~="add"]')) && !doc.defaultView?.matchMedia?.(COMPACT).matches;
}

/**
 * Create a segmented control of radio buttons.
 * @param {Document} doc the document
 * @param {string} legend the group name
 * @param {string} name the radio name
 * @param {[string, string][]} options the values and their labels
 * @returns {HTMLFieldSetElement} the control
 */
function segmented(doc, legend, name, options) {
  const set = el(doc, 'fieldset', 'segmented');
  const row = el(doc, 'div', 'segmented__options');
  for (const [value, label] of options) {
    const option = el(doc, 'label', 'segmented__option');
    const radio = doc.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = value;
    option.append(radio, ` ${label}`);
    row.append(option);
  }
  set.append(el(doc, 'legend', 'segmented__legend', legend), row);
  return set;
}

/**
 * Split a stored due time into local date and time values; 23:59 is a date-only due time (`TSK-6`).
 * @param {string|null} iso the stored due time
 * @returns {{date: string, time: string}} the input values
 */
function dueParts(iso) {
  if (!iso) {
    return { date: '', time: '' };
  }
  const due = new Date(iso);
  const pad = (number) => String(number).padStart(2, '0');
  const date = `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
  const dateOnly = due.getHours() === 23 && due.getMinutes() === 59;
  return { date, time: dateOnly ? '' : `${pad(due.getHours())}:${pad(due.getMinutes())}` };
}

/**
 * Mount the task editor of a task route into an editor panel.
 * @param {{body: HTMLElement, document: Document, setTitle: Function, close: Function}} panel the panel
 * @param {{params: {taskId: string}}} route the editor route
 * @param {object} context the editor context
 * @param {object} context.store the store facade
 * @param {{show: Function}} context.toaster the toaster
 * @param {string} [context.locale] the locale of times, the user's by default
 * @param {{send: Function}} [context.api] the API client, which the history reads the server routes with while connected
 * @param {{state: () => string}} [context.session] the session; without one, the app is in local mode
 * @param {() => Date} [context.now] the clock, for the display rule of the status
 * @returns {{idle: () => Promise<void>, returnFocus: () => HTMLElement|null, destroy: () => void}} the editor
 */
export function mountTaskEditor(panel, route, { store, toaster, locale, api = null, session = null, now = () => new Date() }) {
  const doc = panel.document;
  const taskId = route.params.taskId;
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const n = (instances += 1);
  let task = null;
  let lists = [];
  let members = [];
  let userId = null;
  let shownDeleted = false;
  let pending = null;
  let destroyed = false;
  const shown = new Map();
  // The values each save helper last handled, so closing never saves them again, such as after Escape.
  const saved = new Map();

  /**
   * Put a stored value into a control, remembering it, so leaving the control unchanged can show a newer one.
   * @param {HTMLInputElement|HTMLTextAreaElement} control the control
   * @param {string} value the value
   */
  const put = (control, value) => {
    control.value = value;
    shown.set(control, value);
    saved.delete(control);
  };

  /**
   * Report a change that could not be saved.
   * @param {unknown} error the failure
   */
  function fail(error) {
    console.error('Task editor change failed:', error);
    toaster.show(STRINGS.failed);
  }

  /**
   * Store task changes; a validation failure shows on the field, other failures in a toast.
   * @param {object} changes the changed fields
   * @param {{setError: Function}} [field] the field that shows a validation failure
   * @param {'updateTask'|'updateRules'} [operation] the store method: task fields or lifecycle rules
   * @returns {Promise<void>}
   */
  async function save(changes, field, operation = 'updateTask') {
    try {
      await store[operation](taskId, changes);
      field?.setError(null);
    }
    catch (error) {
      if (error?.name === 'ValidationError' && field) {
        field.setError(error.message);
      }
      else {
        fail(error);
      }
    }
  }

  panel.setTitle(STRINGS.title);
  const banner = el(doc, 'div', 'banner');
  banner.setAttribute('role', 'status');
  banner.append(spriteIcon(doc, 'bin', 'icon banner__icon'), el(doc, 'p', 'banner__text', STRINGS.inBin));
  const restore = el(doc, 'button', 'button button--secondary', STRINGS.restore);
  restore.type = 'button';
  restore.addEventListener('click', () => store.restoreTask(taskId).catch(fail));
  banner.append(restore);
  const lock = el(doc, 'div', 'banner');
  lock.dataset.banner = 'read-only';
  lock.setAttribute('role', 'status');
  lock.hidden = true;
  const lockText = el(doc, 'p', 'banner__text');
  lock.append(spriteIcon(doc, 'alert', 'icon banner__icon'), lockText);

  // The tabs follow the WAI-ARIA tabs pattern of the vendored tabs.js; a new mount, also for another task, starts on Content.
  const tabsRoot = el(doc, 'div', 'tabs task-editor__tabs');
  tabsRoot.dataset.tabsRoot = '';
  const tabList = el(doc, 'div', 'tabs__list');
  tabList.dataset.tabsList = '';
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', STRINGS.sections);
  tabsRoot.append(tabList);
  const tabs = {};
  const panels = {};
  for (const [name, label] of [['content', STRINGS.content], ['status', STRINGS.status], ['history', STRINGS.history]]) {
    const tab = el(doc, 'button', 'tabs__tab', label);
    tab.type = 'button';
    tab.id = `task-editor-${n}-tab-${name}`;
    tab.dataset.tabsTab = '';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `task-editor-${n}-panel-${name}`);
    tab.setAttribute('aria-selected', String(name === 'content'));
    const tabPanel = el(doc, 'div', 'tabs__panel task-editor__panel');
    tabPanel.id = `task-editor-${n}-panel-${name}`;
    tabPanel.dataset.tabsPanel = '';
    tabPanel.dataset.tab = name;
    tabPanel.setAttribute('role', 'tabpanel');
    tabPanel.setAttribute('aria-labelledby', tab.id);
    tabPanel.hidden = name !== 'content';
    tabList.append(tab);
    tabsRoot.append(tabPanel);
    tabs[name] = tab;
    panels[name] = tabPanel;
  }
  // The fields of Content and Status sit in fieldsets, which disable them all for a deleted task or a viewer.
  const fieldsets = ['content', 'status'].map((name) => panels[name].appendChild(el(doc, 'fieldset', 'task-editor__fields')));
  const [contentFields, statusFields] = fieldsets;
  let readOnly = false;
  // Closing saves typed values, whose errors then select no tab.
  let closing = false;
  /**
   * Select a tab, as a click on it does.
   * @param {'content'|'status'|'history'} name the tab
   */
  const showTab = (name) => tabs[name].click();
  /**
   * Add a section to a tab.
   * @param {HTMLElement} parent the fieldset or panel
   * @param {string} name the `data-section` name
   * @param {string} [title] the heading
   * @returns {HTMLElement} the section
   */
  const section = (parent, name, title) => {
    const element = el(doc, 'div', 'editor-panel__section');
    element.dataset.section = name;
    if (title) {
      element.append(el(doc, 'h3', 'editor-panel__section-title', title));
    }
    parent.append(element);
    return element;
  };
  /**
   * Add the horizontal rule between two parts of a tab.
   * @param {HTMLElement} parent the fieldset or panel
   * @returns {HTMLHRElement} the rule
   */
  const rule = (parent) => parent.appendChild(el(doc, 'hr', 'task-editor__rule'));

  const description = createEditorField(doc, { label: STRINGS.description, name: 'description', tag: 'textarea' });
  section(contentFields, 'description').append(description.element);
  /** Save the description; an empty or too long one is a field error. */
  function saveDescription() {
    saved.set(description.control, description.control.value);
    const value = description.control.value.trim();
    const error = !value ? STRINGS.required : value.length > DESCRIPTION_MAX ? STRINGS.tooLong : null;
    description.setError(error);
    if (!error) {
      save({ description: value }, description);
    }
  }
  description.control.addEventListener('change', saveDescription);
  description.control.addEventListener('blur', () => {
    if (task && description.control.value === shown.get(description.control)) {
      put(description.control, task.description);
    }
  });

  const statusLine = el(doc, 'p', 'task-editor__status');
  const statusIcon = spriteIcon(doc, 'status-ready');
  const statusText = el(doc, 'span', 'task-editor__status-text');
  statusLine.append(statusIcon, statusText);
  /**
   * Create an icon button; its icon never previews a status it leads to.
   * @param {string} icon the sprite icon
   * @param {string} label the accessible name
   * @returns {HTMLButtonElement} the button
   */
  const iconButton = (icon, label) => {
    const button = el(doc, 'button', 'icon-button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.append(spriteIcon(doc, icon));
    return button;
  };
  const stateGroup = el(doc, 'div', 'segmented__options task-editor__states');
  stateGroup.setAttribute('role', 'group');
  stateGroup.setAttribute('aria-label', STRINGS.status);
  const stateButtons = STATES.map((status) => {
    const button = iconButton(`status-${status}`, STATUS_LABELS[status]);
    button.classList.add('task-editor__state');
    button.dataset.status = status;
    button.setAttribute('aria-pressed', 'false');
    return button;
  });
  stateGroup.append(...stateButtons);
  const stepper = el(doc, 'div', 'task-editor__stepper');
  stepper.setAttribute('role', 'group');
  stepper.setAttribute('aria-label', STRINGS.completions);
  const stepDown = iconButton('minus', STRINGS.stepDown);
  stepDown.dataset.step = 'down';
  const stepUp = iconButton('plus', STRINGS.stepUp);
  stepUp.dataset.step = 'up';
  const countText = el(doc, 'span', 'task-editor__count');
  countText.setAttribute('aria-live', 'polite');
  stepper.append(stepDown, countText, stepUp);
  stepper.hidden = true;
  const previousPeriod = el(doc, 'button', 'button button--secondary task-editor__previous');
  previousPeriod.type = 'button';
  previousPeriod.dataset.action = 'previous-period';
  previousPeriod.hidden = true;
  const statusControls = el(doc, 'div', 'task-editor__status-controls');
  statusControls.append(stateGroup, stepper, previousPeriod);
  const statusSection = section(statusFields, 'status');
  statusSection.append(el(doc, 'h3', 'editor-panel__section-title', STRINGS.status), statusLine, statusControls);
  rule(statusFields);
  const listsSection = section(statusFields, 'lists', STRINGS.lists);
  rule(statusFields);

  // What the last fill showed, so a click posts the events from the state the user saw.
  let shownOccurrence = null;
  let closedSeries = false;
  let graceNumber = null;
  let posting = Promise.resolve();

  /**
   * Post events in order, after those of earlier clicks; a failed event stops the rest.
   * @param {string[]} types the event types
   * @param {{occurrence: number}} [options] the occurrence the events name, the current one by default
   */
  function post(types, options) {
    posting = posting.then(async () => {
      for (const type of types) {
        await (options ? store.postEvent(taskId, type, options) : store.postEvent(taskId, type));
      }
    }).catch(fail);
  }

  stateGroup.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[data-status]');
    if (!button || button.disabled || !shownOccurrence) {
      return;
    }
    // A closed recurring series takes only reopen, which opens a fresh period.
    const status = button.dataset.status;
    post(closedSeries ? (status === 'ready' ? ['reopen'] : []) : eventsTowardsStatus(shownOccurrence, status, task['lifecycle-rules']));
  });
  stepper.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[data-step]');
    if (!button || button.disabled || !shownOccurrence) {
      return;
    }
    // Minus from 1 starts again, so the task stays In progress at 0 rather than falling back to Ready.
    post(button.dataset.step === 'up' ? ['complete'] : shownOccurrence['completion-count'] === 1 ? ['uncomplete', 'start'] : ['uncomplete']);
  });
  previousPeriod.addEventListener('click', () => {
    if (graceNumber !== null) {
      post(['complete'], { occurrence: graceNumber });
    }
  });

  const target = createEditorField(doc, { label: STRINGS.target, name: 'target-count', type: 'number', hint: STRINGS.targetHint });
  Object.assign(target.control, { min: '1', max: String(TARGET_MAX), step: '1' });
  target.control.inputMode = 'numeric';
  const targetSection = section(statusFields, 'target');
  targetSection.append(target.element);
  /** Save the target count through the lifecycle rules; anything but a whole number from 1 to 999 is a field error. */
  function saveTarget() {
    const text = target.control.value.trim();
    saved.set(target.control, target.control.value);
    const value = /^\d+$/.test(text) ? Number(text) : NaN;
    const error = Number.isInteger(value) && value >= 1 && value <= TARGET_MAX ? null : STRINGS.targetRange;
    target.setError(error);
    if (!error) {
      save({ 'target-count': value }, target, 'updateRules');
    }
  }
  target.control.addEventListener('change', saveTarget);
  target.control.addEventListener('blur', () => {
    if (task && target.control.value === shown.get(target.control)) {
      put(target.control, String(task['lifecycle-rules']['target-count']));
    }
  });

  const date = createEditorField(doc, { label: STRINGS.dueDate, name: 'due-date', type: 'date' });
  const time = createEditorField(doc, { label: STRINGS.dueTime, name: 'due-clock', type: 'time' });
  const clear = el(doc, 'button', 'button button--quiet', STRINGS.clear);
  clear.type = 'button';
  clear.setAttribute('aria-label', STRINGS.clearLabel);
  const dueRow = el(doc, 'div', 'editor-panel__row');
  dueRow.append(date.element, time.element, clear);
  const dueSection = section(statusFields, 'due', STRINGS.due);
  dueSection.append(dueRow);

  /** Save the due date and time; a time without a date or a year below 1000 is a field error. */
  function saveDue() {
    const [day, clock] = [date.control.value, time.control.value];
    saved.set(date.control, day);
    saved.set(time.control, clock);
    const error = !day && clock ? STRINGS.dateFirst : day && Number(day.split('-')[0]) < 1000 ? STRINGS.fullYear : null;
    date.setError(error);
    if (error) {
      return;
    }
    let value = day || null;
    if (day && clock) {
      const [year, month, dayOfMonth] = day.split('-').map(Number);
      const [hours, minutes] = clock.split(':').map(Number);
      value = new Date(year, month - 1, dayOfMonth, hours, minutes).toISOString();
    }
    save({ 'due-time': value }, date, 'updateRules');
  }
  dueRow.addEventListener('focusout', () => setTimeout(() => {
    if (destroyed || dueRow.contains(doc.activeElement) || !task) {
      return;
    }
    if (date.control.value === shown.get(date.control) && time.control.value === shown.get(time.control)) {
      const due = dueParts(task['lifecycle-rules']['due-time']);
      put(date.control, due.date);
      put(time.control, due.time);
      date.setError(null);
    }
    else {
      saveDue();
    }
  }));
  clear.addEventListener('click', () => {
    date.control.value = '';
    time.control.value = '';
    saveDue();
    date.control.focus();
  });

  const overdue = segmented(doc, STRINGS.overdue, `overdue-${n}`, [['keep', STRINGS.keep], ['cancel', STRINGS.cancel]]);
  const overdueSection = section(statusFields, 'overdue');
  overdueSection.append(overdue);
  overdue.addEventListener('change', (event) => save({ 'overdue-handling': event.target.value }, null, 'updateRules'));

  const unit = createEditorField(doc, {
    label: STRINGS.repeat, name: 'recurrence-unit', tag: 'select',
    choices: [['', STRINGS.never], ['day', STRINGS.daily], ['week', STRINGS.weekly], ['month', STRINGS.monthly]].map(([value, label]) => ({ value, label })),
  });
  /**
   * Name the error of every native number constraint with the editor's own message.
   * @param {string} message the message
   * @returns {Object<string, string>} the messages by validity key
   */
  const numberMessages = (message) => ({ rangeOverflow: message, rangeUnderflow: message, stepMismatch: message, badInput: message });
  const interval = createEditorField(doc, {
    label: STRINGS.interval, name: 'recurrence-interval', type: 'number', hint: STRINGS.intervalHint, messages: numberMessages(STRINGS.intervalRange),
  });
  Object.assign(interval.control, { min: '1', max: '99', step: '1' });
  interval.control.inputMode = 'numeric';
  const endDate = createEditorField(doc, { label: STRINGS.endDate, name: 'recurrence-end-date', type: 'date', hint: STRINGS.endDateHint });
  const endCount = createEditorField(doc, {
    label: STRINGS.endCount, name: 'recurrence-end-count', type: 'number', hint: STRINGS.endCountHint, messages: numberMessages(STRINGS.endCountRange),
  });
  Object.assign(endCount.control, { min: '1', step: '1' });
  endCount.control.inputMode = 'numeric';
  const zone = createEditorField(doc, { label: STRINGS.timezone, name: 'timezone', hint: STRINGS.timezoneHint });
  zone.control.autocomplete = 'off';
  zone.control.spellcheck = false;
  const zones = el(doc, 'datalist', 'task-editor__zones');
  zones.id = `task-editor-${n}-zones`;
  zones.append(...(Intl.supportedValuesOf?.('timeZone') ?? []).map((name) => Object.assign(doc.createElement('option'), { value: name })));
  zone.control.setAttribute('list', zones.id);
  const recurrence = el(doc, 'div', 'task-editor__recurrence');
  recurrence.append(interval.element, endDate.element, endCount.element, zone.element, zones);
  const repeatSection = section(statusFields, 'repeat');
  repeatSection.append(unit.element, recurrence);

  /** Save the repeat unit: Never stops the recurrence, and a first unit also sets interval 1 and the browser's timezone. */
  function saveUnit() {
    const value = unit.control.value || null;
    saved.set(unit.control, unit.control.value);
    const recurring = Boolean(task?.['lifecycle-rules']['recurrence-unit']);
    save(value && !recurring ? { 'recurrence-unit': value, 'recurrence-interval': 1, timezone: browserTimezone() } : { 'recurrence-unit': value }, unit, 'updateRules');
  }
  unit.control.addEventListener('change', saveUnit);

  /**
   * Save a whole-number rule field, or show its field error.
   * @param {{control: HTMLInputElement, setError: Function}} field the field
   * @param {string} name the rule field
   * @param {(value: number|null) => boolean} valid whether a value, null for an empty field, may be saved
   * @param {string} message the field error
   */
  function saveNumber(field, name, valid, message) {
    const text = field.control.value.trim();
    saved.set(field.control, field.control.value);
    const value = text === '' ? null : /^\d+$/.test(text) ? Number(text) : NaN;
    if (!valid(value)) {
      field.setError(message);
      return;
    }
    field.setError(null);
    save({ [name]: value }, field, 'updateRules');
  }
  const saveInterval = () => saveNumber(interval, 'recurrence-interval', (value) => Number.isInteger(value) && value >= 1 && value <= 99, STRINGS.intervalRange);
  const saveEndCount = () => saveNumber(endCount, 'recurrence-end-count', (value) => value === null || (Number.isInteger(value) && value >= 1), STRINGS.endCountRange);
  interval.control.addEventListener('change', saveInterval);
  endCount.control.addEventListener('change', saveEndCount);

  /** Save the end date once focus leaves it, since a date field changes on each typed digit; a short year is a field error. */
  function saveEndDate() {
    const value = endDate.control.value;
    saved.set(endDate.control, value);
    if (value && Number(value.split('-')[0]) < 1000) {
      endDate.setError(STRINGS.fullYear);
      return;
    }
    endDate.setError(null);
    save({ 'recurrence-end-date': value || null }, endDate, 'updateRules');
  }
  endDate.control.addEventListener('blur', () => {
    if (task && endDate.control.value !== shown.get(endDate.control) && endDate.control.value !== saved.get(endDate.control)) {
      saveEndDate();
    }
  });

  /** Save the timezone; a name that is no IANA zone is a field error. */
  function saveZone() {
    const value = zone.control.value.trim();
    saved.set(zone.control, zone.control.value);
    if (!isValidTimezone(value)) {
      zone.setError(STRINGS.timezoneInvalid);
      return;
    }
    zone.setError(null);
    save({ timezone: value }, zone, 'updateRules');
  }
  zone.control.addEventListener('change', saveZone);
  for (const [field, rule] of [[interval, 'recurrence-interval'], [endCount, 'recurrence-end-count'], [zone, 'timezone']]) {
    field.control.addEventListener('blur', () => {
      if (task && field.control.value === shown.get(field.control)) {
        put(field.control, String(task['lifecycle-rules'][rule] ?? ''));
      }
    });
  }

  const chips = el(doc, 'ul', 'chip-list');
  const combo = createEditorField(doc, { label: STRINGS.addToList, name: 'add-to-list', hideLabel: true });
  const input = combo.control;
  input.placeholder = STRINGS.addToList;
  input.autocomplete = 'off';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  const listbox = el(doc, 'ul', 'menu combo-box__list');
  listbox.id = `task-editor-${n}-lists`;
  listbox.setAttribute('role', 'listbox');
  listbox.setAttribute('aria-label', STRINGS.lists);
  listbox.hidden = true;
  input.setAttribute('aria-controls', listbox.id);
  const comboBox = el(doc, 'div', 'combo-box');
  comboBox.append(combo.element, listbox);
  listsSection.append(chips, comboBox);
  let options = [];
  let active = -1;

  /**
   * Show or hide the options that match the typed text: free lists, then Create list for a new name.
   * @param {boolean} show whether the list box opens
   */
  function showOptions(show) {
    const text = input.value.trim();
    const lower = text.toLocaleLowerCase();
    options = lists.filter((list) => !members.includes(list.id) && can(listRole(list), 'add-to-list') && list.name.toLocaleLowerCase().includes(lower))
      .map((list) => ({ list, label: list.name }));
    if (text && !lists.some((list) => list.name.trim().toLocaleLowerCase() === lower)) {
      options.push({ create: text, label: STRINGS.createList(text) });
    }
    active = Math.min(active, options.length - 1);
    listbox.replaceChildren(...options.map((option, index) => {
      const item = el(doc, 'li', 'menu__item', option.label);
      item.id = `${listbox.id}-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === active));
      item.addEventListener('mousedown', (event) => event.preventDefault());
      item.addEventListener('click', () => choose(option));
      return item;
    }));
    listbox.hidden = !show || options.length === 0;
    input.setAttribute('aria-expanded', String(!listbox.hidden));
    if (active >= 0 && !listbox.hidden) {
      input.setAttribute('aria-activedescendant', `${listbox.id}-${active}`);
    }
    else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Add the task to a chosen list, creating the list first for a new name.
   * @param {{list?: object, create?: string}} option the chosen option
   * @returns {Promise<void>}
   */
  async function choose(option) {
    try {
      const listId = option.list?.id ?? (await store.createList({ name: option.create })).id;
      await store.addToList(taskId, listId);
      input.value = '';
      active = -1;
      combo.setError(null);
      showOptions(false);
    }
    catch (error) {
      if (error?.name === 'ValidationError') {
        combo.setError(error.message);
      }
      else {
        fail(error);
      }
    }
  }

  input.addEventListener('input', () => {
    active = -1;
    showOptions(true);
  });
  input.addEventListener('blur', () => showOptions(false));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      active = listbox.hidden ? (step > 0 ? 0 : options.length - 1) : (active + step + options.length) % options.length;
      showOptions(true);
    }
    else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[active] ?? options.find((candidate) => candidate.create)
        ?? options.find((candidate) => candidate.label.toLocaleLowerCase() === input.value.trim().toLocaleLowerCase());
      if (option) {
        choose(option);
      }
    }
    else if (event.key === 'Escape' && !listbox.hidden) {
      event.preventDefault();
      showOptions(false);
    }
  });

  // While connected the store holds only the current occurrence, so the note link choice labels the others from the server.
  const loadOccurrences = () => (api && session?.state?.() === 'connected' ? readServerOccurrences(api, taskId) : Promise.resolve(null));
  const thread = createNoteThread({ document: doc, store, taskId, onError: fail, locale, loadOccurrences });
  section(contentFields, 'notes', STRINGS.notes).append(thread.element);
  // History and Details edit nothing, so they sit in no fieldset.
  const history = createTaskHistory({ document: doc, store, taskId, api, session, locale });
  section(panels.history, 'history', STRINGS.history).append(history.element);
  const details = el(doc, 'p', 'editor-panel__details');
  section(panels.history, 'details', STRINGS.details).append(details);
  const deleteRule = rule(panels.status);
  const danger = el(doc, 'div', 'editor-panel__danger');
  const remove = el(doc, 'button', 'button button--danger');
  remove.type = 'button';
  remove.append(spriteIcon(doc, 'bin'), STRINGS.delete);
  remove.addEventListener('click', () => store.deleteTask(taskId).then(() => {
    toaster.show(STRINGS.deleted, { undo: true, onAction: () => store.restoreTask(taskId).catch(fail) });
    panel.close();
  }, fail));
  danger.append(remove);
  panels.status.append(danger);
  panel.body.append(banner, lock, tabsRoot);
  const tabControl = attachTabs(tabsRoot);
  let historyShown = false;
  /** Load the history once its tab first shows; Refresh history loads it again. */
  const loadShownHistory = () => {
    if (!historyShown && !panels.history.hidden) {
      historyShown = true;
      history.load();
    }
  };
  for (const type of ['click', 'keydown', 'focusin']) {
    tabsRoot.addEventListener(type, loadShownHistory);
  }

  /**
   * Make a field error on a hidden tab select that tab and focus the field, such as a validation failure the store
   * reports after the user moved on to another tab.
   * @param {{element: HTMLElement, control: HTMLElement, setError: Function}} field the field
   */
  function revealErrors(field) {
    const setError = field.setError;
    field.setError = (message) => {
      setError(message);
      const tabPanel = field.element.closest('[role="tabpanel"]');
      if (message && !closing && tabPanel?.hidden) {
        showTab(tabPanel.dataset.tab);
        field.control.focus();
      }
    };
  }
  for (const field of [description, target, date, unit, interval, endDate, endCount, zone, combo]) {
    revealErrors(field);
  }

  /**
   * Show the status and its counts, press the state button of the status, and gate the controls.
   * Above target 1, Completed needs the target and In progress a count below it; the stepper shows outside Ready.
   * A focused control that disables or hides passes the focus to the pressed state button.
   */
  function fillStatus() {
    const occurrence = displayTask(task, now())['current-occurrence'];
    const rules = task['lifecycle-rules'];
    const { status } = occurrence;
    const done = occurrence['completion-count'];
    const target = occurrence['target-count'];
    const focused = statusControls.contains(doc.activeElement) ? doc.activeElement : null;
    shownOccurrence = occurrence;
    closedSeries = isRecurring(rules) && occurrence['close-time'] !== null;
    statusLine.dataset.status = status;
    statusIcon.firstElementChild.setAttribute('href', `img/icons.svg#status-${status}`);
    statusText.textContent = `${STATUS_LABELS[status]}${showsCount(occurrence) ? `, ${countWords(occurrence)}` : ''}`;
    for (const button of stateButtons) {
      const state = button.dataset.status;
      const reason = target <= 1 ? null
        : state === 'completed' && done < target ? STRINGS.reachTarget(target)
          : state === 'in-progress' && done >= target ? STRINGS.belowTarget(target) : null;
      button.setAttribute('aria-pressed', String(state === status));
      // A viewer or a deleted task sees every control disabled, also where the fieldset does not reach, as in tests.
      button.disabled = readOnly || (closedSeries ? state !== 'ready' : reason !== null);
      button.title = reason ?? STATUS_LABELS[state];
    }
    stepper.hidden = target <= 1 || status === 'ready';
    const count = STRINGS.count(done, target);
    // The count is a live region, so it changes only when the count does.
    if (countText.textContent !== count) {
      countText.textContent = count;
    }
    const frozen = readOnly || status === 'cancelled' || closedSeries;
    stepDown.disabled = frozen || done === 0;
    stepUp.disabled = frozen;
    graceNumber = graceOccurrence(task, now());
    previousPeriod.hidden = graceNumber === null;
    previousPeriod.disabled = readOnly;
    if (graceNumber !== null) {
      // The previous period ends where the current one starts; a cached one past its end ends at its due time.
      const current = task['current-occurrence'];
      const end = Date.parse(graceNumber === current.occurrence ? current['due-time'] : current['start-time']);
      const zone = isValidTimezone(rules.timezone ?? '') ? rules.timezone : undefined;
      const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: zone }).format(new Date(end - 1));
      previousPeriod.textContent = STRINGS.previousPeriod(day);
    }
    // Only a part of the controls counts as hidden; the Status tab itself may be hidden while a store change fills it.
    if (focused && (focused.disabled || statusControls.contains(focused.closest('[hidden]')))) {
      (stateButtons.find((button) => button.getAttribute('aria-pressed') === 'true' && !button.disabled)
        ?? stateButtons.find((button) => !button.disabled))?.focus();
    }
  }

  /**
   * Tell whether a field keeps its value on a fill: while focused or showing an error.
   * @param {HTMLElement} control the control
   * @returns {boolean} true when the fill skips it
   */
  const busy = (control) => control === doc.activeElement || control.getAttribute('aria-invalid') === 'true';

  /**
   * Fill the fields from the stored task, its lists, and its notes.
   * @param {object[]} notes the notes, newest first
   * @param {object[]} occurrences the stored occurrences of the task
   */
  function fill(notes, occurrences) {
    const deleted = Boolean(task['deletion-time']);
    const wasDeleted = shownDeleted;
    shownDeleted = Boolean(task['deletion-time']);
    const held = lists.filter((list) => members.includes(list.id));
    const role = taskRole(task, held, userId);
    const locked = !can(role, 'update-task');
    const owner = held.find((list) => list.owner)?.owner;
    banner.hidden = !deleted;
    lock.hidden = deleted || !locked;
    lockText.textContent = STRINGS.readOnly(owner?.name || owner?.email || '');
    readOnly = deleted || locked;
    for (const fieldset of fieldsets) {
      fieldset.disabled = readOnly;
    }
    danger.hidden = deleted || !canTrashTask(task, held, userId);
    deleteRule.hidden = danger.hidden;
    if (!busy(description.control)) {
      put(description.control, task.description);
    }
    fillStatus();
    const rules = task['lifecycle-rules'];
    if (!busy(target.control)) {
      put(target.control, String(rules['target-count']));
    }
    const recurring = Boolean(rules['recurrence-unit']);
    const due = dueParts(rules['due-time']);
    if (!busy(date.control) && !busy(time.control)) {
      put(date.control, due.date);
      put(time.control, due.time);
    }
    dueSection.hidden = recurring;
    overdueSection.hidden = recurring || !rules['due-time'];
    if (!busy(unit.control)) {
      put(unit.control, rules['recurrence-unit'] ?? '');
    }
    for (const [field, rule] of [[interval, 'recurrence-interval'], [endDate, 'recurrence-end-date'], [endCount, 'recurrence-end-count'], [zone, 'timezone']]) {
      if (!busy(field.control)) {
        put(field.control, String(rules[rule] ?? ''));
      }
    }
    recurrence.hidden = !recurring;
    const handling = overdueHandlingOf(task) ?? 'keep';
    overdue.querySelector(`input[value="${handling === 'fail' ? 'cancel' : handling}"]`).checked = true;
    const joined = lists.filter((list) => members.includes(list.id));
    chips.replaceChildren(...joined.map((list) => {
      const item = doc.createElement('li');
      const chip = el(doc, 'span', 'chip chip--removable', list.name);
      const button = el(doc, 'button', 'chip__remove');
      button.type = 'button';
      button.setAttribute('aria-label', `${STRINGS.removeFrom}${list.name}`);
      button.disabled = !can(listRole(list), 'remove-from-list');
      button.append(spriteIcon(doc, 'close'));
      button.addEventListener('click', () => store.removeFromList(taskId, list.id).then(() => input.focus(), fail));
      chip.append(button);
      item.append(chip);
      return item;
    }));
    showOptions(!listbox.hidden);
    // The task holds the newest copy of its current occurrence; the store may lack the earlier ones while connected.
    const current = task['current-occurrence'];
    const known = [...occurrences.filter((occurrence) => occurrence.occurrence !== current.occurrence), current];
    thread.render(notes, deleted || !can(role, 'add-note'), userId, { occurrences: known, current: current.occurrence });
    details.textContent = [[STRINGS.created, 'creation-time'], [STRINGS.updated, 'last-update-time']]
      .map(([label, key]) => `${label}${format.format(new Date(task[key]))}`).join(' · ');
    if (wasDeleted && !deleted) {
      showTab('content');
      description.control.focus();
    }
  }

  /**
   * Read the task and fill the fields, once per burst of store changes.
   * @param {boolean} [first] whether this is the first read, which sets the focus
   * @returns {Promise<void>} resolves once filled
   */
  function refresh(first = false) {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      const next = await store.getTask(taskId);
      if (destroyed) {
        return;
      }
      if (!next) {
        toaster.show(STRINGS.notFound);
        panel.close();
        return;
      }
      const [all, ids, notes, occurrences, user] = await Promise.all([store.listLists(), store.listsOfTask(taskId), store.notesOfTask(taskId),
        store.occurrencesOfTask(taskId), store.queue?.getState?.('user-id')]);
      if (destroyed) {
        return;
      }
      task = next;
      userId = user ?? null;
      lists = [...all].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      members = ids;
      fill(notes, occurrences);
      history.showNotes(notes);
      if (first && !addFieldKeepsFocus(doc)) {
        (task['deletion-time'] ? restore : description.control).focus();
      }
    }).catch((error) => console.error('Task editor failed to render:', error));
    return pending;
  }

  const unsubscribe = store.subscribe(() => refresh());
  const first = refresh(true);

  return {
    idle: () => first,
    returnFocus: () => [...doc.querySelectorAll('.task-row')].find((row) => row.dataset.taskId === taskId)
      ?.querySelector('[data-role="open"]') ?? null,
    destroy() {
      closing = true;
      // Closing, such as with Back, fires no change or focusout, so typed values save here, also a fixed invalid one.
      const typed = (control) => task && !readOnly && control.value !== shown.get(control)
        && control.value !== saved.get(control);
      if (typed(description.control)) {
        saveDescription();
      }
      if (typed(target.control)) {
        saveTarget();
      }
      if (typed(date.control) || typed(time.control)) {
        saveDue();
      }
      for (const [control, saveTyped] of [[interval.control, saveInterval], [endDate.control, saveEndDate], [endCount.control, saveEndCount], [zone.control, saveZone]]) {
        if (typed(control)) {
          saveTyped();
        }
      }
      destroyed = true;
      unsubscribe();
      thread.destroy();
      tabControl.destroy();
    },
  };
}
