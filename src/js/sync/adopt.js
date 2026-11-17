/**
 * First-connect adoption: upload the local data to the account and merge local lists into account lists (`CON-4`, `CON-5`).
 *
 * Rules: the todos business logic spec, Adopting Local Data on First Connect.
 * 1. Read the lists the account can see, trashed ones too, from the snapshot of the change feed.
 * 2. Match each local list by identifier (the same list; a live local list restores its trashed account list), by name ignoring case (merge into the account list),
 *    or by the name of a trashed account list (rename to `{{name}} (local)`, `(local 2)`, and so on).
 *    A merged list moves to the account list's identifier locally; the map is saved in `sync-state` as `list-map`.
 * 3. Upload lists, tasks with their lifecycle rules, memberships, the user events of each task, and notes,
 *    then recycle bin states, one idempotent request each. Events replay with `import: true`, as the task owner may.
 * The step count is saved as `adoption`, so an interrupted upload resumes without repeating finished steps;
 * repeating a step is harmless anyway, since every create is idempotent by identifier.
 * A change the service rejects is logged and skipped: adoption never deletes local data.
 */

import { RULE_FIELDS, USER_EVENT_TYPES } from '../core/occurrences.js';
import { judge } from './api.js';

const NAME_MAX = 100;

/**
 * Compare two accounts.
 * @param {{email: string, server: string}|null} a one account
 * @param {{email: string, server: string}|null} b another account
 * @returns {boolean} true when both name the same account on the same server
 */
function sameAccount(a, b) {
  return Boolean(a && b) && a.email === b.email && a.server === b.server;
}

/**
 * Pick a list name that no other list of the owner holds.
 * @param {string} name the local name
 * @param {Set<string>} taken the lowercase names in use
 * @returns {string} `{{name}} (local)`, or `(local 2)` and so on, within 100 characters
 */
function freeName(name, taken) {
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? ' (local)' : ` (local ${n})`;
    const candidate = `${name.slice(0, NAME_MAX - suffix.length).trimEnd()}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
}

/**
 * Turn an account `List` into a local list record, leaving out what the service computes.
 * @param {object} list the `List` of the service
 * @returns {object} the local record
 */
function accountRecord(list) {
  return {
    id: list.id,
    name: list.name,
    description: list.description ?? '',
    owner: list.owner ?? null,
    'creation-time': list['creation-time'],
    'last-update-time': list['last-update-time'] ?? list['creation-time'],
    'deletion-time': list['deletion-time'] ?? null,
  };
}

/**
 * Plan how local lists meet the account's lists.
 * @param {{lists: object[], memberships: object[]}} data the local snapshot
 * @param {object[]} account the account's lists
 * @returns {{changes: object, result: Record<string, string>}} the local changes, and the merged ids by local id
 */
function planMatching(data, account) {
  const owned = account.filter((list) => list.role === 'owner');
  const ids = new Set(account.map((list) => list.id));
  const live = new Map(owned.filter((list) => !list['deletion-time']).map((list) => [list.name.toLowerCase(), list]));
  const taken = new Set([...owned.map((list) => list.name.toLowerCase()), ...data.lists.map((list) => list.name.toLowerCase())]);
  const changes = { put: { lists: [], memberships: [] }, delete: { lists: [], memberships: [] } };
  const merged = {};
  for (const list of [...data.lists].sort((a, b) => a['creation-time'].localeCompare(b['creation-time']) || (a.id < b.id ? -1 : 1))) {
    const key = list.name.toLowerCase();
    const match = live.get(key);
    if (ids.has(list.id)) {
      continue;
    }
    if (match && !list['deletion-time']) {
      merged[list.id] = match.id;
      changes.put.lists.push(accountRecord(match));
      changes.delete.lists.push(list.id);
      for (const membership of data.memberships.filter((m) => m['list-id'] === list.id)) {
        changes.delete.memberships.push([membership['list-id'], membership['task-id']]);
        changes.put.memberships.push({ ...membership, 'list-id': match.id });
      }
    }
    else if (match || owned.some((other) => other.name.toLowerCase() === key)) {
      const name = freeName(list.name, taken);
      taken.add(name.toLowerCase());
      changes.put.lists.push({ ...list, name });
    }
  }
  return { changes, result: merged };
}

/**
 * Build the upload steps from the local data, in the order that keeps each list's manual order.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the local snapshot
 * @param {Set<string>} skipLists identifiers of merged lists, which exist on the account already
 * @returns {{kind: string, record: object}[]} the steps
 */
function planSteps(data, skipLists, restoreLists = new Set()) {
  const byTime = (a, b) => a['creation-time'].localeCompare(b['creation-time']) || (a.id < b.id ? -1 : 1);
  const byPosition = (a, b) => {
    const [x, y] = [a['list-id'], b['list-id']];
    if (x !== y) {
      return x < y ? -1 : 1;
    }
    const [p, q] = [a.position ?? '', b.position ?? ''];
    if (p !== q) {
      return p < q ? -1 : 1;
    }
    return a['task-id'] < b['task-id'] ? -1 : 1;
  };
  const lists = data.lists.filter((list) => !skipLists.has(list.id)).sort(byTime);
  const tasks = [...data.tasks].sort(byTime);
  const notes = [...data.notes].sort(byTime);
  const taskOrder = new Map(tasks.map((task, i) => [task.id, i]));
  const events = (data.events ?? []).filter((event) => USER_EVENT_TYPES.includes(event.type) && taskOrder.has(event['task-id']))
    .sort((a, b) => taskOrder.get(a['task-id']) - taskOrder.get(b['task-id']) || byTime(a, b));
  return [
    ...lists.filter((list) => restoreLists.has(list.id)).map((record) => ({ kind: 'restore-list', record })),
    ...lists.map((record) => ({ kind: 'list', record })),
    ...tasks.map((record) => ({ kind: 'task', record })),
    ...[...data.memberships].sort(byPosition).map((record) => ({ kind: 'membership', record })),
    ...events.map((record) => ({ kind: 'event', record })),
    ...notes.map((record) => ({ kind: 'note', record })),
    ...lists.filter((list) => list['deletion-time']).map((record) => ({ kind: 'trash-list', record })),
    ...tasks.filter((task) => task['deletion-time']).map((record) => ({ kind: 'trash-task', record })),
  ];
}

/**
 * Pick fields of a record.
 * @param {object} record the record
 * @param {string[]} names the field names
 * @returns {object} the fields
 */
function pick(record, names) {
  return Object.fromEntries(names.map((name) => [name, record[name]]));
}

/**
 * Upload one record. A create that finds the row already there (`200`) follows with the field update,
 * so the edit times decide the merge.
 * @param {object} api the API client
 * @param {{kind: string, record: object}} step the step
 * @returns {Promise<{status: number, operation: string}|null>} the refusal, or null when the service accepted it
 */
async function runStep(api, { kind, record }) {
  const times = (names) => Object.fromEntries(names.map((name) => [name, record['last-update-time']]));
  const listFields = ['name', 'description'];
  let request;
  let followUps = [];
  switch (kind) {
    case 'list':
      request = ['POST', '/api/lists', { body: { id: record.id, ...pick(record, listFields), 'creation-time': record['creation-time'] } }];
      followUps = [['PUT', `/api/lists/${record.id}`, { body: { ...pick(record, listFields), 'edit-times': times(listFields) } }]];
      break;
    case 'task': {
      const rules = record['lifecycle-rules'];
      request = ['POST', '/api/tasks', { body: { id: record.id, description: record.description, 'lifecycle-rules': rules, 'creation-time': record['creation-time'] } }];
      followUps = [
        ['PUT', `/api/tasks/${record.id}`, { body: { description: record.description, 'edit-times': times(['description']) } }],
        ['PATCH', `/api/tasks/${record.id}/lifecycle-rules`, { body: { ...pick(rules, RULE_FIELDS), 'edit-times': times(RULE_FIELDS) } }],
      ];
      break;
    }
    case 'membership':
      request = ['PUT', `/api/lists/${record['list-id']}/tasks/${record['task-id']}`, { body: {}, editTime: record['added-time'] }];
      break;
    case 'event':
      request = ['POST', `/api/tasks/${record['task-id']}/events`, {
        body: { id: record.id, type: record.type, 'creation-time': record['creation-time'], occurrence: record.occurrence, import: true },
      }];
      break;
    case 'note':
      request = ['POST', `/api/tasks/${record['task-id']}/notes`, {
        body: {
          id: record.id, text: record.text, occurrence: record.occurrence ?? null,
          'creation-time': record['creation-time'], 'last-update-time': record['last-update-time'] ?? record['creation-time'],
        },
        editTime: record['creation-time'],
      }];
      break;
    case 'restore-list':
      // No edit time: the service takes its receive time, so the restore wins over the older deletion.
      request = ['PUT', `/api/lists/${record.id}`, { body: { 'undo-delete': true } }];
      break;
    case 'trash-list':
      request = ['PUT', `/api/lists/${record.id}`, { body: { delete: true }, editTime: record['deletion-time'] }];
      break;
    default:
      request = ['DELETE', `/api/tasks/${record.id}`, { editTime: record['deletion-time'] }];
      break;
  }
  const refused = (response) => ({ status: response.status, operation: `adopt-${kind}` });
  const response = await api.send(...request);
  if (judge(response) !== 'done') {
    return refused(response);
  }
  if (response.status === 200) {
    for (const followUp of followUps) {
      const update = await api.send(...followUp);
      if (judge(update) !== 'done') {
        return refused(update);
      }
    }
  }
  return null;
}

/**
 * Name the row of a refused step for the sync log; events, notes, and memberships also name their task.
 * @param {{kind: string, record: object}} step the step
 * @returns {object} the log target
 */
function refusedTarget({ kind, record }) {
  const target = { type: kind, id: record.id ?? record['task-id'] };
  if (record.id !== undefined && record['task-id'] !== undefined) {
    target['task-id'] = record['task-id'];
  }
  return target;
}

/**
 * Adopt the local data for an account, unless that already happened.
 * @param {object} options the dependencies
 * @param {object} options.store the store facade
 * @param {object} options.api the API client
 * @param {{email: string, server: string}} options.account the connected account
 * @param {(progress: {done: number, total: number}) => void} [options.onProgress] called after each step
 * @returns {Promise<{skipped?: boolean, lists: number, tasks: number, memberships: number, events: number, notes: number, rejected: number}>} the totals

 * @throws {SyncStop} when the service cannot be reached or asks to stop; the next call resumes
 */
export async function adopt({ store, api, account, onProgress = () => {} }) {
  const { queue } = store;
  const [saved, adoption] = await Promise.all([queue.getState('account'), queue.getState('adoption')]);
  if (sameAccount(saved, account) && adoption?.status === 'done') {
    return { skipped: true, lists: 0, tasks: 0, memberships: 0, events: 0, notes: 0, rejected: 0 };
  }
  const resuming = adoption?.status === 'running' && sameAccount(adoption.account, account);
  if (!resuming) {
    // The upload below covers every queued change, since the queue only holds changes to local data.
    await queue.clear();
    await queue.setState('list-map', {});
    await queue.setState('adoption', { status: 'running', account, done: 0, total: 0 });
  }
  const accountLists = await api.snapshotLists();
  const merged = await store.applyChanges((data) => planMatching(data, accountLists));
  const listMap = { ...(await queue.getState('list-map', {})), ...merged };
  await queue.setState('list-map', listMap);
  const data = await store.snapshot();
  const trashed = new Set(accountLists.filter((list) => list['deletion-time'] && list.role === 'owner').map((list) => list.id));
  const restoreLists = new Set(data.lists.filter((list) => trashed.has(list.id) && !list['deletion-time']).map((list) => list.id));
  const steps = planSteps(data, new Set(Object.values(listMap)), restoreLists);
  const total = steps.length;
  const previous = await queue.getState('adoption');
  let done = resuming && previous.total === total ? previous.done : 0;
  await queue.setState('adoption', { status: 'running', account, done, total });
  const counts = { lists: 0, tasks: 0, memberships: 0, events: 0, notes: 0, rejected: 0 };
  const plural = { list: 'lists', task: 'tasks', membership: 'memberships', event: 'events', note: 'notes' };
  for (const step of steps.slice(0, done)) {
    counts[plural[step.kind]] += 1;
  }
  try {
    for (const step of steps.slice(done)) {
      const refusal = await runStep(api, step);
      if (refusal) {
        counts.rejected += 1;
        await queue.appendLog([{ kind: 'rejected', ...refusal, target: refusedTarget(step), message: 'The service refused a local row, which stays on this device.' }]);
      }
      else if (plural[step.kind]) {
        counts[plural[step.kind]] += 1;
      }
      done += 1;
      onProgress({ done, total });
      if (done % 5 === 0) {
        await queue.setState('adoption', { status: 'running', account, done, total });
      }
    }
  }
  catch (error) {
    await queue.setState('adoption', { status: 'running', account, done, total });
    throw error;
  }
  await queue.setState('account', account);
  await queue.setState('adoption', { status: 'done', account, done, total });
  return counts;
}
