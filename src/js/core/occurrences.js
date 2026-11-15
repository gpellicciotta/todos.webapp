/**
 * Lifecycle rules, occurrences, and events of tasks, folded as the todos.server business logic spec says (`LOC-2`).
 *
 * A task embeds its `lifecycle-rules` and its `current-occurrence`, like the service's `Task` schema.
 * Statuses follow from events: the fold applies them in `creation-time` order, then by `id`,
 * and ignores an event whose precondition fails at its place, so offline reordering never fails.
 * A one-off occurrence closes when it becomes `completed` or `cancelled`, and reopens when it leaves them.
 * A recurring occurrence covers one period (see periods.js) and stays open until its period ends, even at target.
 * Roll-over then closes it with its status and opens the next period, as the server does; missed periods become
 * occurrences with count 0, and the end date or count closes the last one with `end-recurrence` instead.
 * Until a roll-over happens, the display rule shows a task past its period end as `ready` with count 0.
 * See docs/specs/local-store.md, Lifecycle and Recurrence.
 */

import { localDate, nextPeriod, periodContaining } from './periods.js';

/** Occurrence statuses, in lifecycle order; `ready` replaces the former `todo`. */
export const STATUSES = Object.freeze(['ready', 'in-progress', 'completed', 'cancelled']);

/** Statuses of an open occurrence that can still become overdue. */
export const OPEN_STATUSES = Object.freeze(['ready', 'in-progress']);

/** Event types that clients post; the service and the system write the others. */
export const USER_EVENT_TYPES = Object.freeze(['complete', 'uncomplete', 'start', 'unstart', 'cancel', 'reopen']);

/** The rules of a new task: a one-off task with target 1, no deadline, and overdue handling `keep`. */
export const DEFAULT_RULES = Object.freeze({
  'target-count': 1,
  'due-time': null,
  'overdue-handling': 'keep',
  'recurrence-unit': null,
  'recurrence-interval': null,
  'recurrence-end-date': null,
  'recurrence-end-count': null,
  timezone: null,
});

/** Rule field names, in schema order. */
export const RULE_FIELDS = Object.freeze(Object.keys(DEFAULT_RULES));

/** The grace period after a period end, during which a client may still name the previous occurrence. */
export const GRACE_MS = 24 * 3_600_000;

/** The system events that end the period of a recurring occurrence. */
const PERIOD_ENDS = Object.freeze(['roll-over', 'end-recurrence']);

/**
 * Return the status an occurrence takes from its count: `ready` at 0, `completed` at or above target, else `in-progress`.
 * @param {number} count the completion count
 * @param {number} target the target count
 * @returns {string} the status
 */
export function statusFromCount(count, target) {
  if (count <= 0) {
    return 'ready';
  }
  return count >= target ? 'completed' : 'in-progress';
}

/**
 * Tell whether rules describe a recurring task.
 * @param {object} [rules] the lifecycle rules
 * @returns {boolean} true when a recurrence unit is set
 */
export function isRecurring(rules) {
  return Boolean(rules?.['recurrence-unit']);
}

/**
 * Return the period rule of recurring rules, for periods.js.
 * @param {object} rules the lifecycle rules
 * @returns {{unit: string, interval: number, zone: string}} the rule
 */
function ruleOf(rules) {
  return { unit: rules['recurrence-unit'], interval: rules['recurrence-interval'] ?? 1, zone: rules.timezone || 'UTC' };
}

/**
 * Describe a recurrence in words, such as `Weekly` or `Every 2 weeks`.
 * @param {object} rules the lifecycle rules
 * @returns {string|null} the words, or null for a one-off task
 */
export function recurrenceLabel(rules) {
  if (!isRecurring(rules)) {
    return null;
  }
  const unit = rules['recurrence-unit'];
  const interval = rules['recurrence-interval'] ?? 1;
  return interval === 1 ? { day: 'Daily', week: 'Weekly', month: 'Monthly' }[unit] : `Every ${interval} ${unit}s`;
}

/**
 * Complete rules and keep the one-off and recurring shapes apart, as the service does:
 * a recurring task keeps `due-time` and `overdue-handling` empty.
 * @param {object} rules rule fields over the defaults
 * @returns {object} the full rules
 */
export function normalizeRules(rules) {
  const full = { ...DEFAULT_RULES, ...rules };
  if (isRecurring(full)) {
    full['due-time'] = null;
    full['overdue-handling'] = null;
  }
  return full;
}

/**
 * Return a new, open occurrence over a period, with the target of the rules.
 * @param {object} rules the full rules
 * @param {number} number the occurrence number
 * @param {{start: string, end: string|null}} period the period
 * @returns {object} the occurrence, without `task-id`
 */
function opened(rules, number, period) {
  return {
    occurrence: number,
    'start-time': period.start,
    'due-time': period.end,
    'target-count': rules['target-count'] ?? 1,
    'completion-count': 0,
    status: 'ready',
    'close-time': null,
  };
}

/**
 * Return occurrence 1 of a task with the given rules: a one-off task runs from `startTime` to its deadline,
 * and a recurring task covers the period containing `startTime`.
 * @param {object} rules the full rules
 * @param {string} startTime the ISO start time, the task's creation time
 * @returns {object} the occurrence, without `task-id`
 */
export function firstOccurrence(rules, startTime) {
  const period = isRecurring(rules) ? periodContaining(startTime, ruleOf(rules)) : { start: startTime, end: rules['due-time'] ?? null };
  return opened(rules, 1, period);
}

/**
 * Tell whether an occurrence may follow a closed one: not when the closed one reaches the end count,
 * nor when the next period starts after the end date, a local date in the rule's zone.
 * @param {object} rules the recurring rules
 * @param {number} closed the number of the closed occurrence
 * @param {{start: string}} period the period the next occurrence would cover
 * @returns {boolean} true when the recurrence goes on
 */
export function continuesAfter(rules, closed, period) {
  const endCount = rules['recurrence-end-count'];
  if (endCount && closed >= endCount) {
    return false;
  }
  const endDate = rules['recurrence-end-date'];
  return !endDate || localDate(period.start, ruleOf(rules).zone) <= endDate;
}

/**
 * Close a one-off occurrence that became `completed` or `cancelled`, and reopen one that left them.
 * @param {object} occurrence the occurrence, changed in place
 * @param {object} [rules] the lifecycle rules
 * @param {string} time the time of the change
 * @returns {object} the occurrence
 */
function settleClosing(occurrence, rules, time) {
  if (!isRecurring(rules)) {
    const closed = occurrence.status === 'completed' || occurrence.status === 'cancelled';
    occurrence['close-time'] = closed ? occurrence['close-time'] ?? time : null;
  }
  return occurrence;
}

/**
 * Apply one event to an occurrence.
 * Events without effect on the occurrence, such as `create` and rule edits, leave it unchanged.
 * @param {object} occurrence the occurrence before the event
 * @param {{type: string, 'creation-time': string}} event the event
 * @param {object} [rules] the lifecycle rules; a recurring task keeps its occurrence open
 * @returns {object|null} the new occurrence, or null when the event's precondition fails
 */
export function applyEvent(occurrence, event, rules = DEFAULT_RULES) {
  const next = { ...occurrence };
  const time = event['creation-time'];
  const { status } = occurrence;
  const count = occurrence['completion-count'];
  if (isRecurring(rules) && occurrence['close-time'] !== null && !isPeriodEnd(event.type)) {
    // A closed recurring occurrence takes only `reopen`, completed or cancelled, which opens a fresh period.
    if (event.type === 'reopen') {
      return { ...next, 'completion-count': 0, status: 'ready', 'close-time': null };
    }
    if (USER_EVENT_TYPES.includes(event.type) || event.type === 'expire') {
      return null;
    }
  }
  switch (event.type) {
    case 'complete':
    case 'uncomplete': {
      const changed = count + (event.type === 'complete' ? 1 : -1);
      if (status === 'cancelled' || changed < 0) {
        return null;
      }
      next['completion-count'] = changed;
      next.status = statusFromCount(changed, occurrence['target-count']);
      break;
    }
    case 'start':
      if (status !== 'ready') {
        return null;
      }
      next.status = 'in-progress';
      break;
    case 'unstart':
      if (status !== 'in-progress' || count !== 0) {
        return null;
      }
      next.status = 'ready';
      break;
    case 'cancel':
      if (status === 'cancelled') {
        return null;
      }
      next.status = 'cancelled';
      next['close-time'] = time;
      return next;
    case 'expire':
      if (!OPEN_STATUSES.includes(status)) {
        return null;
      }
      next.status = 'cancelled';
      next['close-time'] = time;
      return next;
    case 'reopen':
      if (status !== 'cancelled') {
        return null;
      }
      next.status = statusFromCount(count, occurrence['target-count']);
      next['close-time'] = null;
      break;
    case 'roll-over':
      // The occurrence keeps its status; staying in the same closed status keeps the close time.
      next['close-time'] = occurrence['close-time'] ?? time;
      return next;
    case 'end-recurrence':
      // Below target, the series ended unmet.
      next.status = count >= occurrence['target-count'] ? 'completed' : 'cancelled';
      next['close-time'] = next.status === status && occurrence['close-time'] ? occurrence['close-time'] : time;
      return next;
    default:
      return next;
  }
  return settleClosing(next, rules, time);
}

/**
 * Plan the roll-over of a recurring task up to a moment: close each occurrence whose period ended with a `roll-over`
 * event, and open the next one, until the open occurrence covers `now` or the end rules close it with `end-recurrence`.
 * Missed periods become occurrences that open and close in the same roll-over, with count 0 and status `ready`.
 * Each event takes the due time of the occurrence it closes as its time.
 * @param {object} rules the lifecycle rules
 * @param {object} current the current occurrence
 * @param {string|Date|number} now the moment to roll over to
 * @returns {{occurrences: object[], events: object[], current: object}} the closed and opened occurrences, oldest first,
 *   the events without identifiers, and the new current occurrence; empty and unchanged when nothing rolls over
 */
export function planRollOver(rules, current, now) {
  const until = new Date(now).getTime();
  const occurrences = [];
  const events = [];
  let occurrence = current;
  while (isRecurring(rules) && occurrence['close-time'] === null && occurrence['due-time'] && Date.parse(occurrence['due-time']) <= until) {
    const time = occurrence['due-time'];
    const next = nextPeriod({ start: occurrence['start-time'], end: time }, ruleOf(rules));
    const type = continuesAfter(rules, occurrence.occurrence, next) ? 'roll-over' : 'end-recurrence';
    const closed = applyEvent(occurrence, { type, 'creation-time': time }, rules);
    occurrences.push(closed);
    events.push({ type, occurrence: occurrence.occurrence, 'creation-time': time });
    if (type === 'end-recurrence') {
      return { occurrences, events, current: closed };
    }
    occurrence = opened(rules, occurrence.occurrence + 1, next);
  }
  if (occurrence !== current) {
    occurrences.push(occurrence);
  }
  return { occurrences, events, current: occurrence };
}

/**
 * Return the occurrence a reopen, or a recurrence set on a closed task, opens after the closed current occurrence:
 * the period containing `now`, unless the end rules allow no further occurrence.
 * @param {object} rules the recurring rules
 * @param {object} closed the closed current occurrence
 * @param {string|Date|number} now the moment
 * @returns {object|null} the occurrence to open, or null when the recurrence has ended
 */
export function freshOccurrence(rules, closed, now) {
  const period = periodContaining(now, ruleOf(rules));
  return continuesAfter(rules, closed.occurrence, period) ? opened(rules, closed.occurrence + 1, period) : null;
}

/**
 * Fold all events of an occurrence again from its opening, as the server does after a late event joins it.
 * A closed recurring occurrence stays closed through its `roll-over` or `end-recurrence` event.
 * @param {object} occurrence the occurrence
 * @param {object[]} events the events of that occurrence
 * @param {object} rules the lifecycle rules
 * @returns {object} the folded occurrence
 */
export function refoldOccurrence(occurrence, events, rules) {
  return foldEvents({ ...occurrence, 'completion-count': 0, status: 'ready', 'close-time': null }, events, rules);
}

/**
 * Tell whether a recurring task is past its period end without a roll-over yet, so the display rule applies.
 * @param {object} task the task
 * @param {string|Date|number} now the current time
 * @returns {boolean} true when its open occurrence's due time has passed
 */
export function isStale(task, now) {
  return isStaleOccurrence(task['lifecycle-rules'], task['current-occurrence'], now);
}

/**
 * Tell whether an open recurring occurrence is past its period end, as `isStale` does for a task.
 * @param {object} rules the lifecycle rules
 * @param {object} occurrence the current occurrence
 * @param {string|Date|number} now the current time
 * @returns {boolean} true when its due time has passed
 */
export function isStaleOccurrence(rules, occurrence, now) {
  return isRecurring(rules) && occurrence['close-time'] === null && Boolean(occurrence['due-time'])
    && Date.parse(occurrence['due-time']) <= new Date(now).getTime();
}

/**
 * Apply the display rule: a recurring task past its period end shows as `ready` with count 0 until it rolls over.
 * The shown occurrence keeps its number and due time, so grace completion can still name it.
 * @param {object} task the task
 * @param {string|Date|number} now the current time
 * @returns {object} the task to show: the same object when the rule does not apply
 */
export function displayTask(task, now) {
  if (!isStale(task, now)) {
    return task;
  }
  return { ...task, 'current-occurrence': { ...task['current-occurrence'], 'completion-count': 0, status: 'ready' } };
}

/**
 * Apply the display rule to tasks, as views do before they filter, sort, group, and count them.
 * @param {object[]} tasks the tasks
 * @param {string|Date|number} now the current time
 * @returns {object[]} the tasks to show
 */
export function displayTasks(tasks, now) {
  return tasks.map((task) => displayTask(task, now));
}

/**
 * Tell whether any task passed its period end between two times, so a view must filter its tasks again.
 * @param {object[]} tasks the tasks
 * @param {string|Date|number} from the time of the last render
 * @param {string|Date|number} to the current time
 * @returns {boolean} true when the display rule newly applies to a task
 */
export function becameStale(tasks, from, to) {
  return tasks.some((task) => isStale(task, to) && !isStale(task, from));
}

/**
 * Name the occurrence that grace completion completes, within 24 hours after its period ended:
 * the cached current occurrence past its period end, or the previous one once the task rolled over.
 * @param {object} task the task, as stored or as shown
 * @param {string|Date|number} now the current time
 * @returns {number|null} the occurrence number, or null outside the grace period
 */
export function graceOccurrence(task, now) {
  if (!isRecurring(task['lifecycle-rules'])) {
    return null;
  }
  const time = new Date(now).getTime();
  const occurrence = task['current-occurrence'];
  if (isStale(task, now)) {
    return time <= Date.parse(occurrence['due-time']) + GRACE_MS ? occurrence.occurrence : null;
  }
  const start = Date.parse(occurrence['start-time']);
  return occurrence.occurrence > 1 && time >= start && time <= start + GRACE_MS ? occurrence.occurrence - 1 : null;
}

/**
 * Tell whether an event type ends the period of a recurring occurrence.
 * @param {string} type the event type
 * @returns {boolean} true for `roll-over` and `end-recurrence`
 */
export function isPeriodEnd(type) {
  return PERIOD_ENDS.includes(type);
}

/**
 * Compare events by creation time, then by identifier.
 * @param {object} a an event
 * @param {object} b another event
 * @returns {number} negative, zero, or positive
 */
export function byEventOrder(a, b) {
  const x = Date.parse(a['creation-time']);
  const y = Date.parse(b['creation-time']);
  if (x !== y) {
    return x - y;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}

/**
 * Fold events onto an occurrence in creation-time order, then by identifier.
 * An event whose precondition fails at its place is ignored.
 * In a recurring occurrence the event that ends its period applies last, as the server's fold does,
 * so it closes the occurrence with the status of all its other events, also of late ones.
 * @param {object} occurrence the occurrence before the events
 * @param {object[]} events the events
 * @param {object} [rules] the lifecycle rules
 * @returns {object} the occurrence after the events
 */
export function foldEvents(occurrence, events, rules = DEFAULT_RULES) {
  const recurring = isRecurring(rules);
  const ordered = [...events].sort((a, b) => (recurring ? isPeriodEnd(a.type) - isPeriodEnd(b.type) : 0) || byEventOrder(a, b));
  return ordered.reduce((current, event) => applyEvent(current, event, rules) ?? current, occurrence);
}

/**
 * Pick the next event that moves an occurrence towards a status, as the todos.server status mapping does.
 * @param {object} occurrence the occurrence
 * @param {string} status the wanted status
 * @returns {string|null} the event type, or null when the occurrence has the status
 */
function nextEventTowards(occurrence, status) {
  const current = occurrence.status;
  if (current === status) {
    return null;
  }
  if (status === 'cancelled') {
    return 'cancel';
  }
  if (current === 'cancelled') {
    return 'reopen';
  }
  if (status === 'completed') {
    return 'complete';
  }
  if (status === 'in-progress') {
    return current === 'ready' ? 'start' : 'uncomplete';
  }
  return occurrence['completion-count'] > 0 ? 'uncomplete' : 'unstart';
}

/**
 * Return the events that move an occurrence to a status: `completed` posts `complete`, `cancelled` posts `cancel`,
 * `in-progress` posts `start`, and going back posts `uncomplete`, `unstart`, or `reopen`.
 * A target above 1 takes one `complete` per missing completion.
 * @param {object} occurrence the occurrence
 * @param {string} status the wanted status, one of `STATUSES`
 * @param {object} [rules] the lifecycle rules
 * @returns {string[]} the event types, in order
 */
export function eventsTowardsStatus(occurrence, status, rules = DEFAULT_RULES) {
  const types = [];
  let current = occurrence;
  const limit = 2 * Math.max(occurrence['target-count'], occurrence['completion-count']) + 4;
  for (let type = nextEventTowards(current, status); type && types.length < limit; type = nextEventTowards(current, status)) {
    const next = applyEvent(current, { type, 'creation-time': current['start-time'] }, rules);
    if (!next) {
      break;
    }
    types.push(type);
    current = next;
  }
  return types;
}

/**
 * Apply a rule edit to a task, as the service does: target and deadline edits move the open occurrence,
 * and unit, interval, and timezone edits apply from the next period.
 * Making an open one-off task recurring turns its occurrence into the period containing `time`;
 * making a closed one opens a fresh occurrence over that period, unless the end rules allow none.
 * Stopping recurrence turns the occurrence into a one-off occurrence without a deadline, with handling `keep`.
 * @param {object} task a task with `lifecycle-rules` and `current-occurrence`
 * @param {object} edit rule fields; `null` clears a field
 * @param {string} time the edit time
 * @returns {{'lifecycle-rules': object, 'current-occurrence': object}} the new rules and the current occurrence,
 *   a new occurrence when its number differs from the old one
 */
export function applyRuleEdit(task, edit, time) {
  const before = { ...DEFAULT_RULES, ...task['lifecycle-rules'] };
  let rules = { ...before, ...edit };
  if (!isRecurring(rules) && isRecurring(before)) {
    Object.assign(rules, { 'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null, 'overdue-handling': 'keep' });
  }
  rules = normalizeRules(rules);
  const current = task['current-occurrence'];
  const open = current['close-time'] === null;
  const occurrence = { ...current };
  if (isRecurring(rules) && !isRecurring(before)) {
    if (!open) {
      return { 'lifecycle-rules': rules, 'current-occurrence': freshOccurrence(rules, current, time) ?? occurrence };
    }
    const period = periodContaining(time, ruleOf(rules));
    Object.assign(occurrence, { 'start-time': period.start, 'due-time': period.end });
  }
  else if (!isRecurring(rules) && isRecurring(before)) {
    occurrence['due-time'] = null;
    if (!open) {
      // A closed occurrence keeps its target and fold, since a one-off fold would move its close time.
      return { 'lifecycle-rules': rules, 'current-occurrence': occurrence };
    }
  }
  else if (!isRecurring(rules)) {
    occurrence['due-time'] = rules['due-time'];
  }
  if (open || !isRecurring(rules)) {
    occurrence['target-count'] = rules['target-count'];
    if (occurrence.status !== 'cancelled' && occurrence['completion-count'] > 0) {
      occurrence.status = statusFromCount(occurrence['completion-count'], occurrence['target-count']);
    }
    settleClosing(occurrence, rules, time);
  }
  return { 'lifecycle-rules': rules, 'current-occurrence': occurrence };
}

/**
 * Read the status of a task: the status of its current occurrence.
 * @param {object} task the task
 * @returns {string} the status
 */
export function statusOf(task) {
  return task['current-occurrence'].status;
}

/**
 * Read the due time of a task: the due time of its current occurrence.
 * @param {object} task the task
 * @returns {string|null} the ISO due time, or null
 */
export function dueTimeOf(task) {
  return task['current-occurrence']['due-time'] ?? null;
}

/**
 * Read the overdue handling of a task from its rules.
 * @param {object} task the task
 * @returns {string|null} `keep`, `cancel`, or null for a recurring task
 */
export function overdueHandlingOf(task) {
  return task['lifecycle-rules']['overdue-handling'];
}

/**
 * Tell whether overdue handling must expire a task now: a one-off task past its deadline,
 * with handling `cancel`, whose occurrence is still open below target (`OVD-4`).
 * @param {object} task the task
 * @param {Date|number} now the current time
 * @returns {boolean} true when an `expire` event applies
 */
export function shouldExpire(task, now) {
  const due = dueTimeOf(task);
  return overdueHandlingOf(task) === 'cancel' && Boolean(due) && OPEN_STATUSES.includes(statusOf(task))
    && Date.parse(due) < new Date(now).getTime();
}

/**
 * Return the later of two ISO times, or whichever is set.
 * @param {string|null|undefined} a a time
 * @param {string|null|undefined} b another time
 * @returns {string|null} the later time
 */
function laterTime(a, b) {
  if (!a || !b) {
    return a || b || null;
  }
  return Date.parse(b) > Date.parse(a) ? b : a;
}

/**
 * Build an event record, in the service's `TaskEvent` schema.
 * @param {object} fields `id`, `task-id`, `type`, `creation-time`, and optionally `owner-id` and `occurrence`
 * @returns {object} the event
 */
export function makeEvent({ id, 'task-id': taskId, type, 'creation-time': time, 'owner-id': ownerId = null, occurrence = 1 }) {
  return { id, 'task-id': taskId, occurrence, 'creation-time': time, 'owner-id': ownerId, type, details: null };
}

/**
 * Convert a task of the former shape, with `status`, `due-time`, `overdue-handling`, and `last-activity-time`,
 * as the server migration does: occurrence 1, the rules, a `create` event, and at most one status event.
 * @param {object} legacy the former task
 * @param {(time: string) => string} newId returns a new event identifier for an event time
 * @returns {{task: object, events: object[]}} the task in the new shape and its events
 */
export function fromLegacyTask(legacy, newId) {
  const {
    status, 'due-time': dueTime = null, 'overdue-handling': handling = 'keep', 'last-activity-time': activity, ...rest
  } = legacy;
  const current = !status || status === 'todo' ? 'ready' : status;
  const rules = { ...DEFAULT_RULES, 'due-time': dueTime ?? null, 'overdue-handling': handling ?? 'keep' };
  const statusTime = legacy['last-update-time'] ?? legacy['creation-time'];
  const closed = current === 'completed' || current === 'cancelled';
  const task = {
    id: rest.id,
    description: rest.description,
    'owner-id': rest['owner-id'] ?? null,
    'lifecycle-rules': rules,
    'current-occurrence': {
      ...firstOccurrence(rules, legacy['creation-time']),
      'completion-count': current === 'completed' ? 1 : 0,
      status: current,
      'close-time': closed ? statusTime : null,
    },
    'creation-time': legacy['creation-time'],
    'last-update-time': laterTime(legacy['last-update-time'], activity) ?? legacy['creation-time'],
    'deletion-time': rest['deletion-time'] ?? null,
    ...(rest.revision === undefined ? {} : { revision: rest.revision }),
  };
  const events = [makeEvent({ id: newId(legacy['creation-time']), 'task-id': task.id, type: 'create', 'creation-time': legacy['creation-time'], 'owner-id': task['owner-id'] })];
  const statusEvent = { 'in-progress': 'start', completed: 'complete', cancelled: 'cancel' }[current];
  if (statusEvent) {
    events.push(makeEvent({ id: newId(statusTime), 'task-id': task.id, type: statusEvent, 'creation-time': statusTime }));
  }
  return { task, events };
}

/**
 * Convert a task back to the former shape of backup format 1: the status of its current occurrence,
 * with `ready` as `todo`, the one-off deadline rules, and its last update time as both times.
 * Format 1 has no recurrence, so a recurring task exports without due time and with handling `keep`.

 * @param {object} task the task
 * @returns {object} the former task fields
 */
export function toLegacyTask(task) {
  const status = statusOf(task);
  return {
    id: task.id,
    description: task.description,
    status: status === 'ready' ? 'todo' : status,
    'due-time': task['lifecycle-rules']['due-time'] ?? null,
    'overdue-handling': task['lifecycle-rules']['overdue-handling'] ?? 'keep',
    'owner-id': task['owner-id'] ?? null,
    'creation-time': task['creation-time'],
    'last-update-time': task['last-update-time'],
    'last-activity-time': task['last-update-time'],
    'deletion-time': task['deletion-time'] ?? null,
  };
}
