/**
 * Task editor: every field of one task, saved on change, with no Save button.
 *
 * Four tabs under the header split the sections, with the vendored tabs.js; each open starts on Status (`TSK-18`).
 * Status: the status line, the progress box with its meter, the actions no log derives (Check off, the checks stepper,
 * Mark started, Reopen, Check off previous period), the Log form, and the live entries with Undo (TSK-21, TSK-22).
 * What is logged decides the status, so there are no status buttons; the rules of progress sit in core/progress.js.
 * Notes: the note thread (`NOT-1` to `NOT-6`), whose add field also searches it.
 * Configuration, with a rule between each part: description (`TSK-1`), lists (`TSK-8`), Goal (`TSK-15`),
 * Recurrence (`TSK-16`), Time window with start, due, and overdue behavior (`TSK-5` to `TSK-7`, `TSK-20`),
 * and the Danger zone with Cancel task and Delete task (`TSK-11`).
 * History: details (`TSK-12`), then history (`TSK-17`), which loads when its tab first shows.
 * Above the tabs, the description heads every tab (`TSK-23`).
 * A field error on a hidden tab, such as a late validation failure, selects that tab.
 * Goal, recurrence, start, due, and overdue behavior edit the lifecycle rules. The goal is a plain check, or at least or
 * at most a target of checks, time, an amount, or a reading; At most needs a due time or a recurrence.
 * Recurrence makes the task recurring by day, week, month, or year in the browser's timezone; a recurring task then
 * shows its interval, end date, end count, and timezone, and Never stops it. Past its period end, the status shows
 * the display rule's `ready` with count 0 until the roll-over. History lists the occurrences and events on request.
 * An invalid value shows a field error and saves nothing.
 * A deleted task opens read-only with a Restore banner (`BIN-6`); an unknown task closes with a toast.
 * A viewer sees every field read-only under a banner naming the list owner, and only the task owner or the owner of a
 * list holding the task may cancel or delete it; the lists offered follow the roles (`SHR-4`, `SHR-5`).
 * Store changes, also from other tabs, fill the fields again, except a focused or invalid one;
 * a focused field left unchanged then shows the newest value. The due date and time save once focus leaves them,
 * since a date field changes on each typed digit, such as year 0202 on the way to 2026.
 * Once loaded, the editor focuses the selected tab, except while the add field holds the focus on a wide screen:
 * there the panel sits beside the rows, so the user keeps typing the next task (`TSK-13`).
 */

import { displayTask, graceOccurrence, isRecurring, overdueHandlingOf, USER_EVENT_TYPES } from '../core/occurrences.js';
import { browserTimezone, isValidTimezone } from '../core/periods.js';
import { can, canTrashTask, listRole, taskRole } from '../core/permissions.js';
import { durationWords, entryWords, formatMeasure, meterColor, overage, paceNow, progressOf, trackOf, windowShare } from '../core/progress.js';

import { DESCRIPTION_MAX } from '../store/tasks.js';
import { attachTabs } from '../../vendor/design/js/tabs.js';
import { createEditorField } from './editor-panel.js';
import { createTaskHistory, readServerOccurrences } from './task-history.js';
import { createNoteThread } from './notes.js';
import { make as el, spriteIcon, STATUS_LABELS } from './task-list.js';

/** Editor strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  title: 'Task', sections: 'Task sections', status: 'Status', notes: 'Notes', configuration: 'Configuration', history: 'History',
  description: 'Description', completions: 'Completions', stepDown: 'Undo a completion', stepUp: 'Add a completion',
  count: (done, target) => `${done} of ${target}`,
  previousPeriod: (day) => `Check off previous period (${day})`,
  previousChecked: (day) => `Checked off the period of ${day}.`,
  uncancelHint: 'Uncancel in Configuration.',
  checkOff: 'Check off', markStarted: 'Mark started', unmarkStarted: 'Unmark started', reopen: 'Reopen', notOnTrack: ', not on track',
  progress: 'Progress', paceNow: (value) => `pace now: ${value}`,
  today: (day) => `Today, ${day}`, dueOn: (day) => `Due ${day}`,
  overLimit: (words) => `${words} over the limit`, overFails: 'The window fails if the progress stays above the limit at its end.',
  behindPace: (gone, unit, done) => `Behind pace: ${gone} the ${unit} is gone, ${done} done.`,
  toGo: (words) => `${words} to go.`, leftBefore: (words) => `${words} left before the limit.`, noReading: 'No reading yet.',
  reached: 'Target reached.', within: 'Stayed within the limit.', endedBelow: 'The window ended below the target.',
  endedAbove: 'The window ended above the limit.', cancelled: 'This task is cancelled.', carried: ' (carried)', max: 'max ',
  log: 'Log', logForm: 'Log an entry', logLabel: 'Label (optional)', logCheck: 'Check', logTime: 'Time spent', logAmount: 'Amount', logReading: 'Reading',
  addTime: '+ Time spent', addAmount: '+ Amount', addCheck: '+ Check', entries: 'Entries', entriesEmpty: 'No entries yet.',
  entriesTotal: (words) => `Total: ${words}`, undo: 'Undo', undoEntry: (what) => `Undo ${what}`, logNothing: 'Enter a value to log.',
  logAmountInvalid: 'Enter an amount from 0 to 999,999,999,999.999, with at most 3 decimals.',
  logTimeInvalid: 'Enter whole hours and minutes from 0 to 59, at least 1 minute in all.', logLabelLong: 'A label holds at most 100 characters.',
  longTime: (hours, minutes) => `Log ${hours} h ${minutes} min? That is more than 12 hours.`, change: 'Change', logAnyway: 'Log anyway',
  you: 'You', collaborator: 'Collaborator', 
  goal: 'Goal', check: 'Check', atLeast: 'At least', atMost: 'At most', measure: 'Measure', target: 'Target', unit: 'Unit',
  measures: [['checks', 'Checks'], ['time', 'Time spent'], ['amount', 'Amount (sum)'], ['reading', 'Reading (latest)']],
  hours: 'Hours', minutes: 'Minutes',
  targetWhole: 'Enter a whole number from 1 to 999,999,999,999.',
  targetDecimal: 'Enter a number from 0 to 999,999,999,999.999, with at most 3 decimals.',
  targetTime: 'Enter whole hours and minutes from 0 to 59, at least 1 minute in all.',
  unitHint: 'A label such as kcal or kg.', unitTooLong: 'A unit holds at most 20 characters.',
  atMostNeedsWindow: 'At most needs a due time or a recurrence.',
  subject: (unitName) => (unitName ? `Each ${unitName}` : 'The task'),
  checkWord: (count) => `${count} ${count === 1 ? 'check' : 'checks'}`,
  succeeds: (subject, amount, atMost) => `${subject} succeeds at ${amount} or ${atMost ? 'less' : 'more'}.`,
  due: 'Due', dueDate: 'Due date', dueTime: 'Due time', clear: 'Clear', clearLabel: 'Clear the due date',
  overdue: 'When overdue', keep: 'Keep open', fail: 'Fail', windowTitle: 'Time window',
  windowNote: (unitName) => `Each ${unitName} ends the window, so Due hides.`,
  starts: 'Starts', startsFirst: 'Starts must be before the due time.', startsEnd: 'Starts must be before the recurrence end date.',
  startsText: (time) => `Starts ${time}`,
  lists: 'Lists', addToList: 'Add to list', createList: (name) => `Create list "${name}"`, removeFrom: 'Remove from ',
  details: 'Details', created: 'Created ', updated: 'Last updated ',
  danger: 'Danger zone', cancelTask: 'Cancel task', uncancelTask: 'Uncancel', cancelFinished: 'A finished task cannot be cancelled.',
  delete: 'Delete task', deleted: 'Task moved to the recycle bin.', inBin: 'This task is in the recycle bin.',
  restore: 'Restore', readOnly: (owner) => `You can only view this task${owner ? `. Its list owner is ${owner}` : ''}.`, notFound: 'That task was not found.', failed: 'That change could not be saved.',
  required: 'Enter a description.', tooLong: `A description holds at most ${DESCRIPTION_MAX} characters.`,
  dateFirst: 'Enter a date to set a time.', fullYear: 'Enter a four-digit year.',
  recurrence: 'Recurrence', never: 'Never', day: 'Day', week: 'Week', month: 'Month', year: 'Year', interval: 'Every',
  intervalHint: 'How many days, weeks, months, or years each period spans.', intervalRange: 'Enter a whole number from 1 to 99.',
  endDate: 'Ends on', endDateHint: 'No period starts after this date.', endCount: 'Ends after',
  endCountHint: 'The number of periods, whatever their outcome.', endCountRange: 'Enter a whole number of at least 1, or leave it empty.',
  timezone: 'Timezone', timezoneHint: 'Periods start at midnight in this timezone.', timezoneInvalid: 'Enter a timezone such as Europe/Brussels.',
});
let instances = 0;

/** The goal target limits: whole numbers for checks and seconds, thousandths for amounts and readings. */
const TARGET_MAX = 999_999_999_999;

/** The rule changes of the Check goal: at least one check, with no other field. */
const CHECK_GOAL = Object.freeze({ 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 1, 'goal-unit': null });

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

const pad = (number) => String(number).padStart(2, '0');

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
  const date = `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
  const dateOnly = due.getHours() === 23 && due.getMinutes() === 59;
  return { date, time: dateOnly ? '' : `${pad(due.getHours())}:${pad(due.getMinutes())}` };
}

/**
 * Turn a stored start time into the local value of a date and time field.
 * @param {string|null} iso the stored start time
 * @returns {string} the field value, empty without a start time
 */
function startValue(iso) {
  if (!iso) {
    return '';
  }
  const start = new Date(iso);
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
}

/**
 * Tell whether a goal target is valid for a measure.
 * @param {string} measure the goal measure
 * @param {number} value the target
 * @returns {boolean} true when the target is a whole number from 1 for checks and time, or from 0 with 3 decimals for others
 */
function targetFits(measure, value) {
  if (!Number.isFinite(value)) {
    return false;
  }
  return ['checks', 'time'].includes(measure) ? Number.isInteger(value) && value >= 1 && value <= TARGET_MAX : value >= 0 && value <= TARGET_MAX + 0.999;
}

/**
 * Read the events of a task from the server route, which holds them all while connected.
 * @param {{send: Function}} api the API client
 * @param {string} taskId the task identifier
 * @returns {Promise<object[]|null>} the events, or null when the server cannot answer
 */
async function readServerEvents(api, taskId) {
  try {
    const response = await api.send('GET', `/api/tasks/${taskId}/events`);
    return response.ok && Array.isArray(response.body) ? response.body : null;
  }
  catch {
    // No connection or no token: the local events answer instead.
    return null;
  }
}

/**
 * Mount the task editor of a task route into an editor panel.
 * @param {{body: HTMLElement, document: Document, setTitle: Function, setHeading: Function, close: Function}} panel the panel
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
  let userEvents = [];
  let loggedEvents = [];
  let shownDeleted = false;
  let pending = null;
  let destroyed = false;
  // At least with a plain check goal looks like Check, so the choice of At least is kept until the goal differs.
  let pickedAtLeast = false;
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

  // The tabs follow the WAI-ARIA tabs pattern of the vendored tabs.js; a new mount, also for another task, starts on Status.
  const tabsRoot = el(doc, 'div', 'tabs task-editor__tabs');
  tabsRoot.dataset.tabsRoot = '';
  const tabList = el(doc, 'div', 'tabs__list');
  tabList.dataset.tabsList = '';
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', STRINGS.sections);
  tabsRoot.append(tabList);
  const tabs = {};
  const panels = {};
  for (const name of ['status', 'notes', 'configuration', 'history']) {
    const tab = el(doc, 'button', 'tabs__tab', STRINGS[name]);
    tab.type = 'button';
    tab.id = `task-editor-${n}-tab-${name}`;
    tab.dataset.tabsTab = '';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `task-editor-${n}-panel-${name}`);
    tab.setAttribute('aria-selected', String(name === 'status'));
    const tabPanel = el(doc, 'div', 'tabs__panel task-editor__panel');
    tabPanel.id = `task-editor-${n}-panel-${name}`;
    tabPanel.dataset.tabsPanel = '';
    tabPanel.dataset.tab = name;
    tabPanel.setAttribute('role', 'tabpanel');
    tabPanel.setAttribute('aria-labelledby', tab.id);
    tabPanel.hidden = name !== 'status';
    tabList.append(tab);
    tabsRoot.append(tabPanel);
    tabs[name] = tab;
    panels[name] = tabPanel;
  }
  // The fields of Status, Notes, and Configuration sit in fieldsets, which disable them all for a deleted task or a viewer.
  const fieldsets = ['status', 'notes', 'configuration'].map((name) => panels[name].appendChild(el(doc, 'fieldset', 'task-editor__fields')));
  const [statusFields, noteFields, configFields] = fieldsets;
  let readOnly = false;
  // Closing saves typed values, whose errors then select no tab.
  let closing = false;
  /**
   * Select a tab, as a click on it does.
   * @param {'status'|'notes'|'configuration'|'history'} name the tab
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
  /**
   * Create a named part of a section, which the editor hides and shows as a whole.
   * @param {string} name the `data-part` name
   * @param {string} [tag] the element tag
   * @param {string} [text] the text content
   * @returns {HTMLElement} the part
   */
  const part = (name, tag = 'div', text = '') => {
    const element = el(doc, tag, 'task-editor__part', text);
    element.dataset.part = name;
    return element;
  };

  // Configuration holds its parts in this order, with a rule between each.
  const descriptionSection = section(configFields, 'description');
  rule(configFields);
  const listsSection = section(configFields, 'lists', STRINGS.lists);
  rule(configFields);
  const goalSection = section(configFields, 'goal', STRINGS.goal);
  rule(configFields);
  const recurrenceSection = section(configFields, 'recurrence', STRINGS.recurrence);
  rule(configFields);
  const windowSection = section(configFields, 'window', STRINGS.windowTitle);

  const description = createEditorField(doc, { label: STRINGS.description, name: 'description', tag: 'textarea' });
  descriptionSection.append(description.element);
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
  statusLine.tabIndex = -1;
  const statusIcon = spriteIcon(doc, 'status-ready');
  const statusText = el(doc, 'span', 'task-editor__status-text');
  statusLine.append(statusIcon, statusText);
  const windowLine = part('window-line', 'p');
  windowLine.classList.add('editor-panel__details');
  const uncancelHint = part('uncancel-hint', 'p', STRINGS.uncancelHint);
  uncancelHint.classList.add('editor-panel__details');
  uncancelHint.hidden = true;
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
  /**
   * Create a text button of the Status tab.
   * @param {string} action the `data-action` name
   * @param {string} text the label
   * @param {string} [kind] the button kind
   * @returns {HTMLButtonElement} the button
   */
  const actionButton = (action, text, kind = 'secondary') => {
    const button = el(doc, 'button', `button button--${kind}`, text);
    button.type = 'button';
    button.dataset.action = action;
    return button;
  };

  // The progress box: the progress and target in large text, a meter, and a line on what comes next.
  const progressBox = el(doc, 'div', 'progress-box');
  progressBox.dataset.part = 'progress-box';
  const progressText = el(doc, 'p', 'progress-box__value');
  progressText.dataset.part = 'progress';
  const meterWrap = el(doc, 'div', 'progress-box__meter');
  const meter = el(doc, 'div', 'progress-meter');
  meter.dataset.part = 'meter';
  meter.setAttribute('role', 'meter');
  meter.setAttribute('aria-label', STRINGS.progress);
  meter.setAttribute('aria-valuemin', '0');
  const meterFill = el(doc, 'div', 'progress-meter__fill');
  meter.append(meterFill);
  const paceMark = el(doc, 'span', 'progress-meter__pace');
  paceMark.dataset.part = 'pace';
  meterWrap.append(meter, paceMark);
  const nextLine = el(doc, 'p', 'progress-box__next');
  nextLine.dataset.part = 'next';
  progressBox.append(progressText, meterWrap, nextLine);

  // The actions that no log derives, and the checks stepper, centered under the progress box.
  const checkOff = actionButton('check-off', STRINGS.checkOff, 'primary');
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
  const markStarted = actionButton('mark-started', STRINGS.markStarted);
  const reopen = actionButton('reopen', STRINGS.reopen);
  const previousPeriod = actionButton('previous-period', '');
  previousPeriod.classList.add('task-editor__previous');
  const actions = el(doc, 'div', 'task-editor__actions');
  actions.append(checkOff, stepper, markStarted, reopen, previousPeriod);

  // The Log form: the goal's own field, Label, and Log, with the other fields behind "+" buttons.
  const logForm = el(doc, 'form', 'task-editor__log');
  logForm.dataset.part = 'log-form';
  logForm.noValidate = true;
  logForm.setAttribute('aria-label', STRINGS.logForm);
  const logAmount = createEditorField(doc, { label: STRINGS.logAmount, name: 'log-amount', type: 'text' });
  logAmount.control.inputMode = 'decimal';
  logAmount.control.autocomplete = 'off';
  const logHours = createEditorField(doc, { label: STRINGS.hours, name: 'log-hours', type: 'number' });
  const logMinutes = createEditorField(doc, { label: STRINGS.minutes, name: 'log-minutes', type: 'number' });
  for (const field of [logHours, logMinutes]) {
    Object.assign(field.control, { min: '0', step: '1' });
    field.control.inputMode = 'numeric';
  }
  const logLabel = createEditorField(doc, { label: STRINGS.logLabel, name: 'log-label' });
  logLabel.control.autocomplete = 'off';
  const logChecked = doc.createElement('input');
  logChecked.type = 'checkbox';
  logChecked.name = 'log-checked';
  logChecked.className = 'checkbox__control';
  const logCheckPart = part('log-check', 'label');
  logCheckPart.classList.add('checkbox');
  logCheckPart.append(logChecked, ` ${STRINGS.logCheck}`);
  const logAmountPart = part('log-amount');
  logAmountPart.append(logAmount.element);
  const logTimePart = part('log-time');
  logTimePart.classList.add('editor-panel__row');
  logTimePart.append(logHours.element, logMinutes.element);
  const logParts = { time: logTimePart, amount: logAmountPart, check: logCheckPart };
  const logFields = el(doc, 'div', 'task-editor__log-fields');
  const logError = part('log-error', 'p');
  logError.classList.add('field__error');
  logError.setAttribute('role', 'status');
  const addButtons = {
    time: actionButton('add-time', STRINGS.addTime), amount: actionButton('add-amount', STRINGS.addAmount), check: actionButton('add-check', STRINGS.addCheck),
  };
  const addRow = el(doc, 'div', 'task-editor__log-add');
  addRow.append(...Object.values(addButtons));
  const logConfirm = part('log-confirm');
  logConfirm.classList.add('task-editor__log-confirm');
  logConfirm.setAttribute('role', 'alert');
  const confirmText = el(doc, 'p', 'task-editor__log-question');
  const confirmChange = actionButton('log-change', STRINGS.change);
  const confirmAnyway = actionButton('log-anyway', STRINGS.logAnyway, 'primary');
  logConfirm.append(confirmText, confirmChange, confirmAnyway);
  logConfirm.hidden = true;
  const logSubmit = el(doc, 'button', 'button button--primary', STRINGS.log);
  logSubmit.type = 'submit';
  logSubmit.dataset.action = 'log';
  logForm.append(logFields, logLabel.element, logError, addRow, logConfirm, logSubmit);

  // The entries of the current period, newest first, under their own rule.
  const entriesBlock = part('entries-block');
  const entriesList = el(doc, 'ul', 'task-editor__entries');
  entriesList.dataset.part = 'entries';
  const entriesEmpty = part('entries-empty', 'p', STRINGS.entriesEmpty);
  entriesEmpty.classList.add('editor-panel__details');
  const entriesTotal = part('entries-total', 'p');
  entriesTotal.classList.add('editor-panel__details');
  entriesBlock.append(entriesEmpty, entriesList, entriesTotal);

  const statusSection = section(statusFields, 'status');
  statusSection.append(statusLine, windowLine, uncancelHint, progressBox, actions);
  rule(statusSection);
  statusSection.append(el(doc, 'h3', 'editor-panel__section-title', STRINGS.log), logForm);
  rule(statusSection);
  statusSection.append(el(doc, 'h3', 'editor-panel__section-title', STRINGS.entries), entriesBlock);

  // What the last fill showed, so a click acts on the state the user saw.
  let shownOccurrence = null;
  let closedSeries = false;
  let graceNumber = null;
  let graceDay = '';
  let graceDone = false;
  let liveEntries = [];
  let posting = Promise.resolve();
  const revealed = { time: false, amount: false, check: false };
  let logOwn = null;

  /**
   * Run a store operation in order, after those of earlier clicks; a failure shows a toast.
   * @param {() => Promise<unknown>} operation the operation
   * @returns {Promise<void>} resolves once settled
   */
  function run(operation) {
    posting = posting.then(operation).catch(fail);
    return posting;
  }

  /**
   * Post events in order, after those of earlier clicks; a failed event stops the rest.
   * @param {string[]} types the event types
   */
  function post(types) {
    run(async () => {
      for (const type of types) {
        await store.postEvent(taskId, type);
      }
    });
  }

  checkOff.addEventListener('click', () => run(() => store.logEntry(taskId, { checked: true })));
  markStarted.addEventListener('click', () => post([shownOccurrence?.status === 'ready' ? 'start' : 'unstart']));
  reopen.addEventListener('click', () => post(['reopen']));
  stepper.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[data-step]');
    if (!button || button.disabled || !shownOccurrence) {
      return;
    }
    const latest = liveEntries.find((entry) => entry.checked);
    run(() => (button.dataset.step === 'up' ? store.logEntry(taskId, { checked: true }) : latest ? store.undoLog(taskId, latest.id) : Promise.resolve()));
  });
  previousPeriod.addEventListener('click', () => {
    if (graceNumber !== null && !previousPeriod.disabled) {
      const named = graceNumber;
      const day = graceDay;
      run(async () => {
        await store.logEntry(taskId, { checked: true }, { occurrence: named });
        toaster.show(STRINGS.previousChecked(day));
      });
    }
  });
  entriesList.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[data-action="undo"]');
    if (button && !button.disabled) {
      const id = button.closest('li').dataset.entry;
      run(() => store.undoLog(taskId, id));
    }
  });

  /**
   * Name the error of every native number constraint with the editor's own message.
   * @param {string} message the message
   * @returns {Object<string, string>} the messages by validity key
   */
  const numberMessages = (message) => ({ rangeOverflow: message, rangeUnderflow: message, stepMismatch: message, badInput: message });

  // Goal: a segmented control of Check, At least, and At most, then measure, target, and unit for the last two.
  const goalMode = segmented(doc, STRINGS.goal, `goal-mode-${n}`, [['check', STRINGS.check], ['at-least', STRINGS.atLeast], ['at-most', STRINGS.atMost]]);
  goalMode.querySelector('legend').classList.add('visually-hidden');
  const measure = createEditorField(doc, {
    label: STRINGS.measure, name: 'goal-measure', tag: 'select', choices: STRINGS.measures.map(([value, label]) => ({ value, label })),
  });
  const target = createEditorField(doc, { label: STRINGS.target, name: 'goal-target', type: 'text', messages: numberMessages(STRINGS.targetWhole) });
  target.control.inputMode = 'decimal';
  target.control.autocomplete = 'off';
  const hours = createEditorField(doc, { label: STRINGS.hours, name: 'goal-hours', type: 'number', messages: numberMessages(STRINGS.targetTime) });
  const minutes = createEditorField(doc, { label: STRINGS.minutes, name: 'goal-minutes', type: 'number', messages: numberMessages(STRINGS.targetTime) });
  for (const field of [hours, minutes]) {
    Object.assign(field.control, { min: '0', step: '1' });
    field.control.inputMode = 'numeric';
  }
  minutes.control.max = '59';
  const unit = createEditorField(doc, { label: STRINGS.unit, name: 'goal-unit', hint: STRINGS.unitHint });
  unit.control.autocomplete = 'off';
  const measurePart = part('measure');
  measurePart.append(measure.element);
  const targetPart = part('target');
  targetPart.append(target.element);
  const timePart = part('goal-time');
  timePart.classList.add('editor-panel__row');
  timePart.append(hours.element, minutes.element);
  const unitPart = part('unit');
  unitPart.append(unit.element);
  const goalLine = part('goal-line', 'p');
  goalLine.classList.add('editor-panel__details');
  const goalError = part('goal-error', 'p');
  goalError.classList.add('field__error');
  goalError.setAttribute('role', 'status');
  goalSection.append(goalMode, measurePart, targetPart, timePart, unitPart, goalLine, goalError);

  /**
   * Tell whether the task has a window end, which an At most goal needs: a due time or a recurrence.
   * @param {object} rules the lifecycle rules
   * @returns {boolean} true with a due time or a recurrence
   */
  const hasWindowEnd = (rules) => Boolean(rules['due-time']) || isRecurring(rules);

  /**
   * Read the goal mode the rules show: At most, a plain check goal as Check unless At least was picked, or At least.
   * @param {object} rules the lifecycle rules
   * @returns {'check'|'at-least'|'at-most'} the mode
   */
  function modeOf(rules) {
    const plain = rules['goal-direction'] !== 'at-most' && rules['goal-measure'] === 'checks' && rules['goal-target'] === 1;
    pickedAtLeast &&= plain;
    return rules['goal-direction'] === 'at-most' ? 'at-most' : plain && !pickedAtLeast ? 'check' : 'at-least';
  }

  /** Show the goal controls from the stored rules: the mode, the fields it needs, and what succeeds. */
  function showGoal() {
    const rules = task['lifecycle-rules'];
    const mode = modeOf(rules);
    const kind = rules['goal-measure'] ?? 'checks';
    goalMode.querySelector(`input[value="${mode}"]`).checked = true;
    const detailed = mode !== 'check';
    measurePart.hidden = !detailed;
    targetPart.hidden = !detailed || kind === 'time';
    timePart.hidden = !detailed || kind !== 'time';
    unitPart.hidden = !detailed || !['amount', 'reading'].includes(kind);
    const amount = rules['goal-target'];
    const unitName = rules['goal-unit'] ?? '';
    const words = kind === 'checks' ? STRINGS.checkWord(amount) : kind === 'time' ? durationWords(amount)
      : `${amount.toLocaleString(locale, { maximumFractionDigits: 3 })}${unitName ? ` ${unitName}` : ''}`;
    goalLine.textContent = STRINGS.succeeds(STRINGS.subject(isRecurring(rules) ? rules['recurrence-unit'] : ''), words, mode === 'at-most');
  }

  goalMode.addEventListener('change', (event) => {
    if (!task) {
      return;
    }
    const mode = event.target.value;
    const rules = task['lifecycle-rules'];
    goalError.textContent = '';
    if (mode === 'check') {
      pickedAtLeast = false;
      save({ ...CHECK_GOAL }, null, 'updateRules');
    }
    else if (mode === 'at-most' && !hasWindowEnd(rules)) {
      goalError.textContent = STRINGS.atMostNeedsWindow;
      showGoal();
    }
    else if (mode === 'at-most') {
      save({ 'goal-direction': 'at-most' }, null, 'updateRules');
    }
    else if (rules['goal-direction'] === 'at-most') {
      save({ 'goal-direction': 'at-least' }, null, 'updateRules');
    }
    else {
      pickedAtLeast = true;
      showGoal();
    }
  });

  /** Save the measure; a target that the new measure cannot hold goes back to 1. */
  function saveMeasure() {
    const value = measure.control.value;
    saved.set(measure.control, value);
    const current = task['lifecycle-rules']['goal-target'];
    save(targetFits(value, current) ? { 'goal-measure': value } : { 'goal-measure': value, 'goal-target': 1 }, measure, 'updateRules');
  }
  measure.control.addEventListener('change', saveMeasure);

  /** Save the target of checks, an amount, or a reading; anything but a number the measure holds is a field error. */
  function saveTarget() {
    const kind = task['lifecycle-rules']['goal-measure'] ?? 'checks';
    const text = target.control.value.trim();
    saved.set(target.control, target.control.value);
    const decimal = kind === 'amount' || kind === 'reading';
    const value = (decimal ? /^\d+(\.\d{1,3})?$/ : /^\d+$/).test(text) ? Number(text) : NaN;
    const error = targetFits(kind, value) ? null : decimal ? STRINGS.targetDecimal : STRINGS.targetWhole;
    target.setError(error);
    if (!error) {
      save({ 'goal-target': value }, target, 'updateRules');
    }
  }
  target.control.addEventListener('change', saveTarget);

  /** Save a time target from hours and minutes, as seconds; a fraction, 60 minutes, or under 1 minute is a field error. */
  function saveTime() {
    const [hoursText, minutesText] = [hours.control.value.trim() || '0', minutes.control.value.trim() || '0'];
    saved.set(hours.control, hours.control.value);
    saved.set(minutes.control, minutes.control.value);
    const [h, m] = [hoursText, minutesText].map((text) => (/^\d+$/.test(text) ? Number(text) : NaN));
    const seconds = h * 3600 + m * 60;
    const error = m <= 59 && targetFits('time', seconds) ? null : STRINGS.targetTime;
    minutes.setError(error);
    hours.setError(null);
    if (!error) {
      save({ 'goal-target': seconds }, minutes, 'updateRules');
    }
  }
  hours.control.addEventListener('change', saveTime);
  minutes.control.addEventListener('change', saveTime);

  /** Save the unit; one of more than 20 characters is a field error. */
  function saveUnit() {
    const value = unit.control.value.trim();
    saved.set(unit.control, unit.control.value);
    const error = value.length > 20 ? STRINGS.unitTooLong : null;
    unit.setError(error);
    if (!error) {
      save({ 'goal-unit': value || null }, unit, 'updateRules');
    }
  }
  unit.control.addEventListener('change', saveUnit);

  for (const [field, name] of [[target, 'goal-target'], [unit, 'goal-unit']]) {
    field.control.addEventListener('blur', () => {
      if (task && field.control.value === shown.get(field.control)) {
        put(field.control, String(task['lifecycle-rules'][name] ?? ''));
      }
    });
  }

  // Recurrence: Never, Day, Week, Month, or Year; a recurring task then shows its interval, end, and timezone.
  const recurrenceUnit = segmented(doc, STRINGS.recurrence, `recurrence-unit-${n}`,
    [['', STRINGS.never], ['day', STRINGS.day], ['week', STRINGS.week], ['month', STRINGS.month], ['year', STRINGS.year]]);
  recurrenceUnit.querySelector('legend').classList.add('visually-hidden');
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
  recurrenceSection.append(recurrenceUnit, recurrence);

  /** Save the recurrence unit: Never stops the recurrence, and a first unit also sets interval 1 and the browser's timezone. */
  function saveRecurrenceUnit(event) {
    if (!task) {
      return;
    }
    const value = event.target.value || null;
    const rules = task['lifecycle-rules'];
    goalError.textContent = '';
    if (!value && rules['goal-direction'] === 'at-most' && !rules['due-time']) {
      goalError.textContent = STRINGS.atMostNeedsWindow;
      recurrenceUnit.querySelector(`input[value="${rules['recurrence-unit'] ?? ''}"]`).checked = true;
      return;
    }
    save(value && !isRecurring(rules) ? { 'recurrence-unit': value, 'recurrence-interval': 1, timezone: browserTimezone() } : { 'recurrence-unit': value }, null, 'updateRules');
  }
  recurrenceUnit.addEventListener('change', saveRecurrenceUnit);

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
  for (const [field, name] of [[interval, 'recurrence-interval'], [endCount, 'recurrence-end-count'], [zone, 'timezone']]) {
    field.control.addEventListener('blur', () => {
      if (task && field.control.value === shown.get(field.control)) {
        put(field.control, String(task['lifecycle-rules'][name] ?? ''));
      }
    });
  }

  // Time window: Starts, Due, and When overdue.
  const start = createEditorField(doc, { label: STRINGS.starts, name: 'start-time', type: 'datetime-local' });
  const startPart = part('start');
  startPart.append(start.element);
  const startText = part('start-text', 'p');
  startText.hidden = true;
  const date = createEditorField(doc, { label: STRINGS.dueDate, name: 'due-date', type: 'date' });
  const time = createEditorField(doc, { label: STRINGS.dueTime, name: 'due-clock', type: 'time' });
  const clear = el(doc, 'button', 'button button--quiet', STRINGS.clear);
  clear.type = 'button';
  clear.setAttribute('aria-label', STRINGS.clearLabel);
  const dueRow = el(doc, 'div', 'editor-panel__row');
  dueRow.append(date.element, time.element, clear);
  const duePart = part('due');
  duePart.append(dueRow);
  const overdue = segmented(doc, STRINGS.overdue, `overdue-${n}`, [['keep', STRINGS.keep], ['fail', STRINGS.fail]]);
  const overduePart = part('overdue');
  overduePart.append(overdue);
  const windowNote = part('window-note', 'p');
  windowNote.classList.add('editor-panel__details');
  windowNote.hidden = true;
  windowSection.append(startPart, startText, duePart, overduePart, windowNote);

  /** Save the start time once focus leaves it; a short year, or a start not before the due time or end date, is a field error. */
  function saveStart() {
    const value = start.control.value;
    saved.set(start.control, value);
    const rules = task['lifecycle-rules'];
    const year = Number(value.split('-')[0]);
    const error = value && year < 1000 ? STRINGS.fullYear
      : value && rules['due-time'] && new Date(value).getTime() >= Date.parse(rules['due-time']) ? STRINGS.startsFirst
        : value && rules['recurrence-end-date'] && value.slice(0, 10) > rules['recurrence-end-date'] ? STRINGS.startsEnd : null;
    start.setError(error);
    if (!error) {
      save({ 'start-time': value ? new Date(value).toISOString() : null }, start, 'updateRules');
    }
  }
  start.control.addEventListener('blur', () => {
    if (!task) {
      return;
    }
    if (start.control.value === shown.get(start.control)) {
      put(start.control, startValue(task['lifecycle-rules']['start-time']));
    }
    else if (start.control.value !== saved.get(start.control)) {
      saveStart();
    }
  });

  /** Save the due date and time; a time without a date or a year below 1000 is a field error. */
  function saveDue() {
    const [day, clock] = [date.control.value, time.control.value];
    saved.set(date.control, day);
    saved.set(time.control, clock);
    const rules = task['lifecycle-rules'];
    const error = !day && clock ? STRINGS.dateFirst : day && Number(day.split('-')[0]) < 1000 ? STRINGS.fullYear
      : !day && rules['goal-direction'] === 'at-most' && !isRecurring(rules) ? STRINGS.atMostNeedsWindow : null;
    date.setError(error);
    if (error) {
      return;
    }
    let value = day || null;
    if (day && clock) {
      const [year, month, dayOfMonth] = day.split('-').map(Number);
      const [hoursOfDay, minutesOfDay] = clock.split(':').map(Number);
      value = new Date(year, month - 1, dayOfMonth, hoursOfDay, minutesOfDay).toISOString();
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

  overdue.addEventListener('change', (event) => save({ 'overdue-handling': event.target.value }, null, 'updateRules'));

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
  section(noteFields, 'notes').append(thread.element);
  // Details and History edit nothing, so they sit in no fieldset.
  const details = el(doc, 'p', 'editor-panel__details');
  section(panels.history, 'details', STRINGS.details).append(details);
  const history = createTaskHistory({ document: doc, store, taskId, api, session, locale, userId: () => userId });
  section(panels.history, 'history', STRINGS.history).append(history.element);

  // The Danger zone sits outside the fieldset, last on Configuration; only an owner sees it.
  const dangerRule = rule(panels.configuration);
  const dangerSection = section(panels.configuration, 'danger', STRINGS.danger);
  const danger = el(doc, 'div', 'editor-panel__danger');
  const cancelTask = el(doc, 'button', 'button button--secondary', STRINGS.cancelTask);
  cancelTask.type = 'button';
  cancelTask.dataset.action = 'cancel-task';
  cancelTask.addEventListener('click', () => {
    if (shownOccurrence && !cancelTask.disabled) {
      post([shownOccurrence.status === 'cancelled' ? 'reopen' : 'cancel']);
    }
  });
  const remove = el(doc, 'button', 'button button--danger');
  remove.type = 'button';
  remove.append(spriteIcon(doc, 'bin'), STRINGS.delete);
  remove.addEventListener('click', () => store.deleteTask(taskId).then(() => {
    toaster.show(STRINGS.deleted, { undo: true, onAction: () => store.restoreTask(taskId).catch(fail) });
    panel.close();
  }, fail));
  danger.append(cancelTask, remove);
  dangerSection.append(danger);
  // The description heads every tab, so the panel always says which task it edits (`TSK-23`).
  const heading = el(doc, 'p', 'task-editor__heading');
  heading.dataset.part = 'heading';
  const headingText = heading.appendChild(el(doc, 'span', 'task-editor__heading-text'));
  panel.setHeading(heading);
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
  for (const field of [description, measure, target, hours, minutes, unit, start, date, interval, endDate, endCount, zone, combo]) {
    revealErrors(field);
  }

  /**
   * Name a share of the window in words, such as "half".
   * @param {number} share the share from 0 to 1
   * @returns {string} the words, ready to precede "the week"
   */
  function shareWords(share) {
    const named = [[0.25, 'a quarter of'], [0.5, 'half'], [0.75, 'three quarters of']].find(([value]) => Math.abs(value - share) < 0.05);
    return named ? named[1] : `${Math.round(share * 100)}% of`;
  }

  /**
   * Name the window of an occurrence under the status line: today, its period, or its due day.
   * @param {object} occurrence the shown occurrence
   * @param {object} rules the lifecycle rules
   * @returns {string} the words, empty without a due time
   */
  function windowWords(occurrence, rules) {
    if (!occurrence['due-time']) {
      return '';
    }
    const zone = isValidTimezone(rules.timezone ?? '') ? rules.timezone : undefined;
    const dayFormat = (options) => new Intl.DateTimeFormat(locale, { ...options, timeZone: zone });
    const start = Date.parse(occurrence['start-time']);
    const end = Date.parse(occurrence['due-time']);
    if (!isRecurring(rules)) {
      return STRINGS.dueOn(new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(end)));
    }
    const long = dayFormat({ weekday: 'short', day: 'numeric', month: 'short' });
    if (end - start <= 24 * 3_600_000 + 1) {
      const current = now().getTime();
      return current >= start && current < end ? STRINGS.today(long.format(new Date(start))) : long.format(new Date(start));
    }
    const short = dayFormat({ day: 'numeric', month: 'short' });
    return `${short.format(new Date(start))} – ${short.format(new Date(end - 1))}`;
  }

  /**
   * Tell what comes next for an occurrence, in the line under the meter.
   * @param {object} occurrence the shown occurrence
   * @param {ReturnType<typeof progressOf>} p its progress
   * @param {string} track how it stands against the pace of its window
   * @param {object} rules the lifecycle rules
   * @returns {string} the text
   */
  function nextWords(occurrence, p, track, rules) {
    const words = (value) => formatMeasure(p.measure, value, p.unit, locale);
    const atMost = p.direction === 'at-most';
    const { status } = occurrence;
    if (status === 'cancelled') {
      return STRINGS.cancelled;
    }
    if (status === 'failed') {
      return atMost ? STRINGS.endedAbove : STRINGS.endedBelow;
    }
    if (atMost && track === 'over-limit') {
      return `${STRINGS.overLimit(words(overage(occurrence)))}.\n${STRINGS.overFails}`;
    }
    if (p.value === null) {
      return STRINGS.noReading;
    }
    if (status === 'completed') {
      return atMost ? STRINGS.within : STRINGS.reached;
    }
    if (atMost) {
      return STRINGS.leftBefore(words(Math.max(0, p.target - p.value)));
    }
    if (track === 'behind-pace') {
      const gone = windowShare(occurrence, now());
      const done = p.measure === 'checks' ? STRINGS.count(p.value, p.target) : `${formatMeasure(p.measure, p.value, null, locale)} of ${words(p.target)}`;
      return STRINGS.behindPace(shareWords(gone), isRecurring(rules) ? rules['recurrence-unit'] : 'time', done);
    }
    return STRINGS.toGo(words(Math.max(0, p.target - p.value)));
  }

  /**
   * Return the live entries of an occurrence, newest first: its `log` events that no `undo-log` names.
   * @param {number} number the occurrence number
   * @returns {object[]} the events
   */
  function entriesOf(number) {
    const undone = new Set(loggedEvents.filter((event) => event.type === 'undo-log').map((event) => event['target-event-id']));
    return loggedEvents.filter((event) => event.type === 'log' && event.occurrence === number && !undone.has(event.id))
      .sort((a, b) => Date.parse(b['creation-time']) - Date.parse(a['creation-time']) || (a.id < b.id ? 1 : -1));
  }

  /**
   * Draw the entries of the shown period with their total, each with Undo for those who may change the task.
   * @param {ReturnType<typeof progressOf>} p the progress of the shown occurrence
   * @param {boolean} carried whether the progress is a reading carried in from the last period
   */
  function showEntries(p, carried) {
    const connected = Boolean(api) && session?.state?.() === 'connected';
    const focusedUndo = entriesList.contains(doc.activeElement);
    entriesList.replaceChildren(...liveEntries.map((entry) => {
      const item = doc.createElement('li');
      item.dataset.entry = entry.id;
      const time = el(doc, 'time', 'task-editor__entry-time', format.format(new Date(entry['creation-time'])));
      time.dateTime = entry['creation-time'];
      const text = el(doc, 'span', 'task-editor__entry-text');
      text.append(...[entry.label ? el(doc, 'span', 'task-editor__entry-label', entry.label) : null,
        el(doc, 'span', 'task-editor__entry-value', entryWords(entry, p, locale))].filter(Boolean));
      const undo = actionButton('undo', STRINGS.undo, 'secondary');
      undo.setAttribute('aria-label', STRINGS.undoEntry(entry.label || entryWords(entry, p, locale)));
      undo.hidden = readOnly;
      item.append(time, text);
      if (connected) {
        item.append(el(doc, 'span', 'task-editor__entry-author', (entry['owner-id'] ?? null) === null || entry['owner-id'] === userId ? STRINGS.you : STRINGS.collaborator));
      }
      item.append(undo);
      return item;
    }));
    entriesEmpty.hidden = liveEntries.length > 0;
    entriesTotal.hidden = liveEntries.length === 0;
    entriesTotal.textContent = STRINGS.entriesTotal(`${formatMeasure(p.measure, p.value, p.unit, locale)}${carried ? STRINGS.carried : ''}`);
    if (focusedUndo && !entriesList.contains(doc.activeElement)) {
      (entriesList.querySelector('button[data-action="undo"]:not([hidden])') ?? statusLine).focus();
    }
  }

  /**
   * Show the Log form for the goal of the shown occurrence: its own field first, the others behind "+" buttons.
   * @param {ReturnType<typeof progressOf>} p the progress of the shown occurrence
   * @param {{checks: boolean, closed: boolean}} gate whether checks are disabled and whether the occurrence is closed
   */
  function showLogForm(p, gate) {
    const own = p.measure === 'checks' ? 'check' : p.measure === 'time' ? 'time' : 'amount';
    if (own !== logOwn) {
      logOwn = own;
      logFields.replaceChildren(...[own, ...['time', 'amount', 'check'].filter((kind) => kind !== own)].map((kind) => logParts[kind]));
      logChecked.checked = own === 'check';
      Object.assign(revealed, { time: false, amount: false, check: false });
    }
    const unitName = p.unit ? ` (${p.unit})` : '';
    logAmount.element.querySelector('.field__label').textContent = `${p.measure === 'reading' ? STRINGS.logReading : STRINGS.logAmount}${own === 'amount' ? unitName : ''}`;
    for (const kind of ['time', 'amount', 'check']) {
      logParts[kind].hidden = kind !== own && !revealed[kind];
      addButtons[kind].hidden = kind === own || revealed[kind];
    }
    // A cancelled task still logs time and amounts; a closed occurrence takes no entry.
    logChecked.disabled = gate.checks;
    addButtons.check.disabled = gate.checks;
    logSubmit.disabled = gate.closed;
    for (const control of [logAmount.control, logHours.control, logMinutes.control, logLabel.control]) {
      control.disabled = gate.closed;
    }
  }

  /**
   * Show the status, progress, and entries of the current occurrence, and gate the actions.
   * A focused control that disables or hides passes the focus to the status line.
   */
  function fillStatus() {
    const shownTask = displayTask(task, now());
    const occurrence = shownTask['current-occurrence'];
    const rules = task['lifecycle-rules'];
    const { status } = occurrence;
    const p = progressOf(occurrence);
    const track = trackOf(occurrence, now());
    const closed = occurrence['close-time'] !== null;
    const stale = shownTask !== task;
    const focused = statusSection.contains(doc.activeElement) ? doc.activeElement : null;
    shownOccurrence = occurrence;
    closedSeries = isRecurring(rules) && closed;
    liveEntries = stale ? [] : entriesOf(occurrence.occurrence);
    statusLine.dataset.status = status;
    statusLine.dataset.track = track;
    statusIcon.firstElementChild.setAttribute('href', `img/icons.svg#status-${status}`);
    statusText.textContent = `${STATUS_LABELS[status]}${status === 'in-progress' && track !== 'on-track' ? STRINGS.notOnTrack : ''}`;
    windowLine.textContent = windowWords(occurrence, rules);
    windowLine.hidden = windowLine.textContent === '';
    uncancelHint.hidden = status !== 'cancelled';

    // The progress box: large text, the meter, and the line on what comes next.
    const carried = p.measure === 'reading' && p.value !== null && !liveEntries.some((entry) => typeof entry.amount === 'number');
    progressText.textContent = `${formatMeasure(p.measure, p.value, null, locale)}${carried ? STRINGS.carried : ''} / ${p.direction === 'at-most' ? STRINGS.max : ''}${formatMeasure(p.measure, p.target, p.unit, locale)}`;
    progressBox.dataset.state = overage(occurrence) > 0 ? 'over' : 'normal';
    meter.dataset.color = meterColor(occurrence);
    meter.setAttribute('aria-valuemax', String(p.target));
    meter.setAttribute('aria-valuenow', String(p.value ?? 0));
    meter.style.setProperty('--meter-share', `${Math.min(100, p.share * 100)}%`);
    nextLine.textContent = nextWords(occurrence, p, track, rules);
    const pace = paceNow(occurrence, now());
    const showsPace = p.measure === 'checks' && p.target > 1 && p.direction === 'at-least' && pace !== null && !closed;
    paceMark.hidden = !showsPace;
    if (showsPace) {
      paceMark.textContent = STRINGS.paceNow((Math.round(pace * 10) / 10).toLocaleString(locale));
      paceMark.style.setProperty('--pace-share', `${windowShare(occurrence, now()) * 100}%`);
    }

    // The actions that no log derives: viewers and deleted tasks see none.
    const cancelled = status === 'cancelled';
    const countable = p.measure === 'checks';
    actions.hidden = readOnly;
    logForm.hidden = readOnly;
    checkOff.hidden = !countable || p.target > 1;
    checkOff.disabled = closed;
    const live = liveEntries.some((entry) => entry.checked);
    stepper.hidden = !countable || p.target <= 1;
    const count = STRINGS.count(p.value ?? 0, p.target);
    // The count is a live region, so it changes only when the count does.
    if (countText.textContent !== count) {
      countText.textContent = count;
    }
    stepDown.disabled = cancelled || closed || !live;
    stepUp.disabled = cancelled || closed;
    const started = status === 'in-progress' && !(p.value !== null && (p.measure === 'reading' || p.value > 0)) && liveEntries.length === 0
      && !(occurrence.entries?.length > 0);
    markStarted.hidden = !(status === 'ready' || started) || closedSeries || stale;
    markStarted.textContent = status === 'ready' ? STRINGS.markStarted : STRINGS.unmarkStarted;
    reopen.hidden = !(closedSeries || (status === 'failed' && !isRecurring(rules) && p.direction === 'at-least'));
    graceNumber = graceOccurrence(task, now());
    previousPeriod.hidden = graceNumber === null || !countable || graceDone;
    previousPeriod.disabled = cancelled;
    if (graceNumber !== null) {
      // The previous period ends where the current one starts; a cached one past its end ends at its due time.
      const current = task['current-occurrence'];
      const end = Date.parse(graceNumber === current.occurrence ? current['due-time'] : current['start-time']);
      const zoneName = isValidTimezone(rules.timezone ?? '') ? rules.timezone : undefined;
      const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: zoneName }).format(new Date(end - 1));
      graceDay = day;
      previousPeriod.textContent = STRINGS.previousPeriod(day);
    }
    cancelTask.textContent = cancelled ? STRINGS.uncancelTask : STRINGS.cancelTask;
    // Cancel task needs an open occurrence; a cancelled one offers Uncancel, and a finished one neither.
    const finished = !cancelled && closed;
    cancelTask.disabled = readOnly || finished;
    cancelTask.title = finished ? STRINGS.cancelFinished : '';
    showLogForm(p, { checks: cancelled, closed: closed && !cancelled });
    showEntries(p, carried);
    // Only a part of the controls counts as hidden; the Status tab itself may be hidden while a store change fills it.
    const hiddenAncestor = focused?.closest('[hidden]');
    if (focused?.isConnected && (focused.disabled || (hiddenAncestor && statusSection.contains(hiddenAncestor)))) {
      statusLine.focus();
    }
  }

  /**
   * Read the Log form into an entry, showing a field error for a value that breaks a rule.
   * @returns {{entry: object, seconds: number}|null} the entry and its time, or null when the form is invalid
   */
  function readLogForm() {
    const entry = {};
    const errors = [];
    for (const field of [logAmount, logHours, logMinutes, logLabel]) {
      field.setError(null);
    }
    logError.textContent = '';
    if (!logParts.check.hidden && logChecked.checked && !logChecked.disabled) {
      entry.checked = true;
    }
    const amountText = logAmount.control.value.trim();
    if (!logParts.amount.hidden && amountText !== '') {
      const amount = Number(amountText);
      if (!/^\d+(\.\d{1,3})?$/.test(amountText) || amount > 999_999_999_999.999) {
        errors.push([logAmount, STRINGS.logAmountInvalid]);
      }
      else {
        entry.amount = amount;
      }
    }
    const hoursText = logHours.control.value.trim();
    const minutesText = logMinutes.control.value.trim();
    if (!logParts.time.hidden && (hoursText !== '' || minutesText !== '')) {
      const hoursValue = hoursText === '' ? 0 : Number(hoursText);
      const minutesValue = minutesText === '' ? 0 : Number(minutesText);
      const seconds = hoursValue * 3600 + minutesValue * 60;
      if (!Number.isInteger(hoursValue) || !Number.isInteger(minutesValue) || hoursValue < 0 || minutesValue < 0 || minutesValue > 59 || seconds < 60 || seconds > 2_147_483_647) {
        errors.push([logHours, STRINGS.logTimeInvalid]);
      }
      else {
        entry['time-spent-seconds'] = seconds;
      }
    }
    const label = logLabel.control.value.trim();
    if (label.length > 100) {
      errors.push([logLabel, STRINGS.logLabelLong]);
    }
    else if (label) {
      entry.label = label;
    }
    if (errors.length === 0 && !('checked' in entry || 'amount' in entry || 'time-spent-seconds' in entry)) {
      const first = logOwn === 'time' ? logHours : logOwn === 'amount' ? logAmount : null;
      errors.push([first, STRINGS.logNothing]);
    }
    for (const [field, message] of errors) {
      if (field) {
        field.setError(message);
      }
      else {
        logError.textContent = message;
      }
    }
    return errors.length === 0 ? { entry, seconds: entry['time-spent-seconds'] ?? 0 } : null;
  }

  /**
   * Store an entry of the Log form, then clear the form; a rejected entry stays in the form with its error.
   * @param {object} entry the entry
   */
  function logEntry(entry) {
    logConfirm.hidden = true;
    logSubmit.hidden = false;
    run(async () => {
      try {
        await store.logEntry(taskId, entry);
      }
      catch (error) {
        if (error?.name === 'ValidationError') {
          (logOwn === 'time' ? logHours : logOwn === 'amount' ? logAmount : logLabel).setError(error.message);
          return;
        }
        throw error;
      }
      for (const control of [logAmount.control, logHours.control, logMinutes.control, logLabel.control]) {
        control.value = '';
      }
      logChecked.checked = logOwn === 'check';
    });
  }

  let askedEntry = null;
  logForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (logSubmit.disabled || !logConfirm.hidden) {
      return;
    }
    const read = readLogForm();
    if (!read) {
      return;
    }
    // A duration above 12 hours asks in place first, as ADR-0006 asks of clients.
    if (read.seconds > 12 * 3600) {
      askedEntry = read.entry;
      confirmText.textContent = STRINGS.longTime(Math.floor(read.seconds / 3600), Math.floor((read.seconds % 3600) / 60));
      logConfirm.hidden = false;
      logSubmit.hidden = true;
      confirmAnyway.focus();
      return;
    }
    logEntry(read.entry);
  });
  confirmChange.addEventListener('click', () => {
    askedEntry = null;
    logConfirm.hidden = true;
    logSubmit.hidden = false;
    logHours.control.focus();
  });
  confirmAnyway.addEventListener('click', () => {
    if (askedEntry) {
      const entry = askedEntry;
      askedEntry = null;
      logEntry(entry);
    }
  });
  for (const kind of ['time', 'amount', 'check']) {
    addButtons[kind].addEventListener('click', () => {
      revealed[kind] = true;
      logParts[kind].hidden = false;
      addButtons[kind].hidden = true;
      if (kind === 'check') {
        logChecked.checked = true;
        logChecked.focus();
      }
      else {
        (kind === 'time' ? logHours : logAmount).control.focus();
      }
    });
  }

  /**
   * Tell whether a field keeps its value on a fill: while focused or showing an error.
   * @param {HTMLElement} control the control
   * @returns {boolean} true when the fill skips it
   */
  const busy = (control) => control === doc.activeElement || control.getAttribute('aria-invalid') === 'true';

  /**
   * Tell whether the start time may change: period 1 is the only period, open, and free of user events.
   * @returns {boolean} true while Starts is editable
   */
  function startEditable() {
    const current = task['current-occurrence'];
    return current.occurrence === 1 && current['close-time'] === null && (current.progress ?? 0) === 0 && userEvents.length === 0;
  }

  /**
   * Fill the goal, recurrence, and time window from the rules.
   * @param {object} rules the lifecycle rules
   */
  function fillRules(rules) {
    if (!busy(measure.control)) {
      put(measure.control, rules['goal-measure'] ?? 'checks');
    }
    const amount = rules['goal-target'];
    if (!busy(target.control)) {
      put(target.control, String(amount));
    }
    if (!busy(hours.control) && !busy(minutes.control)) {
      put(hours.control, String(Math.floor(amount / 3600)));
      put(minutes.control, String(Math.floor((amount % 3600) / 60)));
    }
    if (!busy(unit.control)) {
      put(unit.control, rules['goal-unit'] ?? '');
    }
    showGoal();
    const recurring = isRecurring(rules);
    recurrenceUnit.querySelector(`input[value="${rules['recurrence-unit'] ?? ''}"]`).checked = true;
    for (const [field, name] of [[interval, 'recurrence-interval'], [endDate, 'recurrence-end-date'], [endCount, 'recurrence-end-count'], [zone, 'timezone']]) {
      if (!busy(field.control)) {
        put(field.control, String(rules[name] ?? ''));
      }
    }
    recurrence.hidden = !recurring;
    const editable = startEditable();
    startPart.hidden = !editable;
    startText.hidden = editable;
    if (!busy(start.control)) {
      put(start.control, startValue(rules['start-time']));
    }
    startText.textContent = STRINGS.startsText(format.format(new Date(rules['start-time'] ?? task['current-occurrence']['start-time'])));
    const due = dueParts(rules['due-time']);
    if (!busy(date.control) && !busy(time.control)) {
      put(date.control, due.date);
      put(time.control, due.time);
    }
    duePart.hidden = recurring;
    const handling = overdueHandlingOf(task) ?? 'keep';
    overduePart.hidden = recurring || !rules['due-time'] || rules['goal-direction'] === 'at-most';
    overdue.querySelector(`input[value="${handling === 'cancel' ? 'fail' : handling}"]`).checked = true;
    windowNote.hidden = !recurring;
    windowNote.textContent = recurring ? STRINGS.windowNote(rules['recurrence-unit']) : '';
  }

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
    dangerSection.hidden = deleted || !canTrashTask(task, held, userId);
    dangerRule.hidden = dangerSection.hidden;
    if (!busy(description.control)) {
      put(description.control, task.description);
    }
    fillStatus();
    fillRules(task['lifecycle-rules']);
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
    headingText.textContent = task.description;
    heading.title = task.description;
    details.textContent = [[STRINGS.created, 'creation-time'], [STRINGS.updated, 'last-update-time']]
      .map(([label, key]) => `${label}${format.format(new Date(task[key]))}`).join(' · ');
    if (wasDeleted && !deleted) {
      showTab('status');
      tabs.status.focus();
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
      // Only an open period 1 needs the events, to tell whether Starts may still change; while connected, the server holds them.
      const connected = Boolean(api) && session?.state?.() === 'connected';
      const firstOpen = next['current-occurrence'].occurrence === 1 && next['current-occurrence']['close-time'] === null;
      // The server history and the local events add up: an event still queued locally is not on the server yet.
      const readEvents = async () => {
        const [remote, local] = await Promise.all([connected ? readServerEvents(api, taskId) : null, store.eventsOfTask ? store.eventsOfTask(taskId) : []]);
        return [...(remote ?? []), ...local];
      };
      // Check off previous period offers only an unmet period. While connected, the service may know more than the device.
      const grace = graceOccurrence(next, now());
      const readGrace = async () => (connected && grace !== null && grace !== next['current-occurrence'].occurrence ? readServerOccurrences(api, taskId) : null);
      const [all, ids, notes, occurrences, user, events, remote] = await Promise.all([store.listLists(), store.listsOfTask(taskId), store.notesOfTask(taskId),
        store.occurrencesOfTask(taskId), store.queue?.getState?.('user-id'), firstOpen || next['current-occurrence'].entries?.length > 0 ? readEvents() : [],
        readGrace()]);
      if (destroyed) {
        return;
      }
      task = next;
      graceDone = [next['current-occurrence'], ...occurrences, ...(remote ?? [])]
        .some((occurrence) => occurrence.occurrence === grace && occurrence.status === 'completed');
      userId = user ?? null;
      userEvents = events.filter((event) => USER_EVENT_TYPES.includes(event.type));
      loggedEvents = [...new Map(events.filter((event) => event.type === 'log' || event.type === 'undo-log').map((event) => [event.id, event])).values()];
      lists = [...all].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      members = ids;
      fill(notes, occurrences);
      history.showNotes(notes);
      if (first && !addFieldKeepsFocus(doc)) {
        (task['deletion-time'] ? restore : tabs.status).focus();
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
      if (typed(hours.control) || typed(minutes.control)) {
        saveTime();
      }
      if (typed(date.control) || typed(time.control)) {
        saveDue();
      }
      for (const [control, saveTyped] of [[unit.control, saveUnit], [start.control, saveStart], [interval.control, saveInterval], [endDate.control, saveEndDate],
        [endCount.control, saveEndCount], [zone.control, saveZone]]) {
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
