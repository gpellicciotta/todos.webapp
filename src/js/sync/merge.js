/**
 * Merge: plans how pulled rows, tombstones, replay conflicts, an expired cursor, and a disconnect change the local data.
 *
 * Every function is pure: it reads a store snapshot and returns the `changes` for `store.applyChanges`.
 * Rules: the todos business logic spec, Change Feed, Tombstones, and Merging by Edit Time.
 * - The service merges fields by edit time. A pulled row replaces the local row, except the fields
 *   that still have an entry in the change queue; those keep their local value until the replay answers.
 * - A row stores the `revision` of the feed. An entry or tombstone applies only when its revision is above the stored one,
 *   or the row is absent. Tombstones apply first. A row whose creation is still queued is never replaced.
 * - Computed fields (`overdue`, `role` of tasks, `task-count`, `lists` of tasks) are not stored; screens derive them.
 */

const LIST_FIELDS = ['name', 'description', 'deletion-time'];
const TASK_FIELDS = ['description', 'status', 'due-time', 'overdue-handling', 'deletion-time'];
const OPERATION_FIELDS = {
  'delete-list': ['deletion-time'],
  'restore-list': ['deletion-time'],
  'delete-task': ['deletion-time'],
  'restore-task': ['deletion-time'],
  'add-membership': ['existence'],
  'remove-membership': ['existence'],
  'move-membership': ['position'],
  'edit-note': ['text'],
  'delete-note': ['existence'],
};

const membershipKey = (listId, taskId) => `${listId}/${taskId}`;

/**
 * Name the row a queue entry changes.
 * @param {{type: string, id: string, 'list-id'?: string}} target the entry target
 * @returns {string} the row key, such as `task:{{id}}`
 */
function rowKey(target) {
  return target.type === 'membership' ? `membership:${membershipKey(target['list-id'], target.id)}` : `${target.type}:${target.id}`;
}

/**
 * Collect what the queue still has to say about each row.
 * @param {object[]} entries the queue entries
 * @returns {Map<string, {create: boolean, fields: Set<string>}>} the pending changes by row key
 */
export function indexPending(entries) {
  const index = new Map();
  const slot = (key) => {
    if (!index.has(key)) {
      index.set(key, { create: false, fields: new Set() });
    }
    return index.get(key);
  };
  for (const { operation, target, fields } of entries) {
    const row = slot(rowKey(target));
    if (operation.startsWith('create-')) {
      row.create = true;
      for (const listId of fields.lists ?? []) {
        slot(`membership:${membershipKey(listId, target.id)}`).create = true;
      }
    }
    else {
      (OPERATION_FIELDS[operation] ?? Object.keys(fields)).forEach((name) => row.fields.add(name));
    }
  }
  return index;
}

/**
 * Tell whether a queue entry refers to any of the rows.
 * @param {object} entry the queue entry
 * @param {Set<string>} ids list and task identifiers
 * @returns {boolean} true when the entry changes one of them, or a membership or note of one
 */
export function entryTouches(entry, ids) {
  const { target } = entry;
  return ids.has(target.id) || ids.has(target['list-id']) || ids.has(target['task-id']);
}

/**
 * Tell whether a user owns a task. Without a known user, nothing is foreign.
 * @param {object} task the task
 * @param {number|string|null} userId the connected user
 * @returns {boolean} true for tasks created here and tasks of the user
 */
export function ownsTask(task, userId) {
  return userId === null || task['owner-id'] === null || task['owner-id'] === undefined || String(task['owner-id']) === String(userId);
}

/**
 * Tell whether a user owns a list. Without a known user, nothing is foreign.
 * @param {object} list the list
 * @param {number|string|null} userId the connected user
 * @returns {boolean} true for local lists and lists of the user
 */
export function ownsList(list, userId) {
  return userId === null || !list.owner || String(list.owner.id) === String(userId);
}

/**
 * Read the connected user from the lists they own.
 * @param {object[]} lists feed lists
 * @returns {number|string|null} the user identifier, or null
 */
export function userOfLists(lists) {
  return lists.find((list) => list.role === 'owner' && list.owner?.id !== undefined)?.owner.id ?? null;
}

const toList = (list) => ({
  id: list.id,
  name: list.name,
  description: list.description ?? '',
  owner: list.owner ?? null,
  role: list.role,
  sharing: list.sharing ?? [],
  'creation-time': list['creation-time'],
  'last-update-time': list['last-update-time'] ?? list['creation-time'],
  'deletion-time': list['deletion-time'] ?? null,
  revision: list.revision,
});

const toTask = (task) => ({
  id: task.id,
  description: task.description,
  status: task.status,
  'due-time': task['due-time'] ?? null,
  'overdue-handling': task['overdue-handling'] ?? 'keep',
  'owner-id': task['owner-id'] ?? null,
  'creation-time': task['creation-time'],
  'last-update-time': task['last-update-time'] ?? task['creation-time'],
  'last-activity-time': task['last-activity-time'] ?? task['last-update-time'] ?? task['creation-time'],
  'deletion-time': task['deletion-time'] ?? null,
  revision: task.revision,
});

const toNote = (note) => ({
  id: note.id,
  'task-id': note['task-id'],
  text: note.text,
  author: note['author-id'] ?? null,
  'creation-time': note['creation-time'],
  'edit-time': note['last-edit-time'] && note['last-edit-time'] !== note['creation-time'] ? note['last-edit-time'] : null,
  revision: note.revision,
});

/**
 * Tell whether a feed row is newer than the stored one.
 * @param {object|undefined} local the stored row
 * @param {object} incoming the feed row
 * @returns {boolean} true when the row is absent, has no revision yet, or has a lower one
 */
const isNewer = (local, incoming) => !local || local.revision === undefined || incoming.revision > local.revision;

/**
 * Plan the changes of one feed page.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the local snapshot
 * @param {object} feed the page: `lists`, `tasks`, `memberships`, `notes`, and `tombstones`
 * @param {object} options the context
 * @param {object[]} [options.pending] the queue entries
 * @param {number|string|null} [options.userId] the connected user
 * @param {boolean} [options.final] true on the last page, when tasks of others without a visible list are dropped
 * @param {Date} options.now the time given to new memberships
 * @returns {{changes: object, empty: boolean, dropped: {lists: string[], tasks: string[]}, lost: {id: string, name: string, tasks: string[]}[]}} the plan
 */
export function planPage(data, feed, { pending = [], userId = null, final = true, now }) {
  const index = indexPending(pending);
  const state = {
    lists: new Map(data.lists.map((row) => [row.id, row])),
    tasks: new Map(data.tasks.map((row) => [row.id, row])),
    memberships: new Map(data.memberships.map((row) => [membershipKey(row['list-id'], row['task-id']), row])),
    notes: new Map(data.notes.map((row) => [row.id, row])),
  };
  const touched = { lists: new Set(), tasks: new Set(), memberships: new Set(), notes: new Set() };
  const droppedLists = new Set();
  const droppedTasks = new Set();
  const lost = [];
  const slot = (key) => index.get(key) ?? { create: false, fields: new Set() };

  const dropList = (id) => {
    state.lists.delete(id);
    droppedLists.add(id);
    for (const [key, row] of state.memberships) {
      if (row['list-id'] === id) {
        state.memberships.delete(key);
      }
    }
  };
  const dropTask = (id) => {
    state.tasks.delete(id);
    droppedTasks.add(id);
    for (const [key, row] of state.memberships) {
      if (row['task-id'] === id) {
        state.memberships.delete(key);
      }
    }
    for (const [key, row] of state.notes) {
      if (row['task-id'] === id) {
        state.notes.delete(key);
      }
    }
  };
  const stale = (row, tombstone) => !row || row.revision >= tombstone.revision;

  for (const tombstone of feed.tombstones ?? []) {
    const { type, id } = tombstone;
    if (type === 'list' && !stale(state.lists.get(id), tombstone) && !slot(`list:${id}`).create) {
      const list = state.lists.get(id);
      if (tombstone.reason === 'access-lost') {
        const tasks = [...state.memberships.values()].filter((row) => row['list-id'] === id).map((row) => row['task-id']);
        lost.push({ id, name: list.name, tasks });
      }
      dropList(id);
    }
    else if (type === 'task' && !stale(state.tasks.get(id), tombstone) && !slot(`task:${id}`).create) {
      dropTask(id);
    }
    else if (type === 'membership') {
      const key = membershipKey(tombstone['list-id'], id);
      if (!stale(state.memberships.get(key), tombstone) && !slot(`membership:${key}`).create && !slot(`membership:${key}`).fields.has('existence')) {
        state.memberships.delete(key);
      }
    }
    else if (type === 'note' && !stale(state.notes.get(id), tombstone) && !slot(`note:${id}`).create && !slot(`note:${id}`).fields.has('existence')) {
      state.notes.delete(id);
    }
  }

  /**
   * Store a pulled list or task, keeping the fields with a pending change.
   * @param {'lists'|'tasks'} kind the row kind
   * @param {object} incoming the feed row
   * @param {object} next the converted row
   * @param {string[]} names the mergeable fields
   */
  function put(kind, incoming, next, names) {
    const type = kind.slice(0, -1);
    const local = state[kind].get(incoming.id);
    const mine = slot(`${type}:${incoming.id}`);
    if (mine.create || !isNewer(local, incoming)) {
      return;
    }
    if (local && mine.fields.size > 0) {
      for (const name of names.filter((field) => mine.fields.has(field))) {
        next[name] = local[name];
      }
      next['last-update-time'] = local['last-update-time'];
      next['last-activity-time'] = local['last-activity-time'] ?? next['last-activity-time'];
    }
    state[kind].set(incoming.id, next);
    touched[kind].add(incoming.id);
  }

  for (const list of feed.lists ?? []) {
    put('lists', list, toList(list), LIST_FIELDS);
  }
  for (const task of feed.tasks ?? []) {
    put('tasks', task, toTask(task), TASK_FIELDS);
  }
  for (const incoming of feed.memberships ?? []) {
    const key = membershipKey(incoming['list-id'], incoming['task-id']);
    const local = state.memberships.get(key);
    const mine = slot(`membership:${key}`);
    if (mine.create || slot(`task:${incoming['task-id']}`).create || mine.fields.has('existence') || !isNewer(local, incoming)) {
      continue;
    }
    state.memberships.set(key, {
      'list-id': incoming['list-id'],
      'task-id': incoming['task-id'],
      position: mine.fields.has('position') && local ? local.position : incoming.position,
      'added-time': local?.['added-time'] ?? now.toISOString(),
      revision: incoming.revision,
    });
    touched.memberships.add(key);
  }
  for (const incoming of feed.notes ?? []) {
    const local = state.notes.get(incoming.id);
    const mine = slot(`note:${incoming.id}`);
    if (mine.create || mine.fields.has('existence') || !isNewer(local, incoming)) {
      continue;
    }
    const next = toNote(incoming);
    if (local && mine.fields.has('text')) {
      next.text = local.text;
      next['edit-time'] = local['edit-time'];
    }
    state.notes.set(incoming.id, next);
    touched.notes.add(incoming.id);
  }

  if (final) {
    // Memberships may arrive after their tasks, so tasks of others lose their place only once the whole feed arrived.
    const held = new Set([...state.memberships.values()].filter((row) => state.lists.has(row['list-id'])).map((row) => row['task-id']));
    for (const task of [...state.tasks.values()]) {
      if (!ownsTask(task, userId) && !held.has(task.id) && !slot(`task:${task.id}`).create) {
        dropTask(task.id);
      }
    }
  }

  const dropped = { lists: [...droppedLists], tasks: [...droppedTasks] };
  const lostLists = lost.filter((item) => droppedLists.has(item.id)).map((item) => ({ ...item, tasks: item.tasks.filter((id) => droppedTasks.has(id)) }));
  return { ...diff(data, state, touched), dropped, lost: lostLists };
}

/**
 * Turn a changed state into `applyChanges` changes.
 * @param {object} data the original snapshot
 * @param {object} state the changed rows by store, as maps
 * @param {object} touched the keys put since the snapshot, by store
 * @returns {{changes: object, empty: boolean}} the changes
 */
function diff(data, state, touched) {
  const changes = { put: {}, delete: { lists: [], tasks: [], memberships: [], notes: [] } };
  for (const kind of ['lists', 'tasks', 'memberships', 'notes']) {
    changes.put[kind] = [...touched[kind]].filter((key) => state[kind].has(key)).map((key) => state[kind].get(key));
  }
  changes.delete.lists = data.lists.filter((row) => !state.lists.has(row.id)).map((row) => row.id);
  changes.delete.tasks = data.tasks.filter((row) => !state.tasks.has(row.id)).map((row) => row.id);
  changes.delete.memberships = data.memberships.filter((row) => !state.memberships.has(membershipKey(row['list-id'], row['task-id']))).map((row) => [row['list-id'], row['task-id']]);
  changes.delete.notes = data.notes.filter((row) => !state.notes.has(row.id)).map((row) => [row['task-id'], row.id]);
  const empty = Object.values(changes.put).every((rows) => rows.length === 0) && Object.values(changes.delete).every((keys) => keys.length === 0);
  return { changes, empty };
}

/**
 * Plan the local effect of a replayed change that lost fields to a newer edit: the kept value applies locally.
 * A field with another queued change stays, since that change replays later with its own edit time.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the local snapshot
 * @param {object} entry the replayed entry
 * @param {object[]} conflicts the `conflicts` of the reply
 * @param {object[]} pending the queue entries, the replayed one included
 * @returns {object} the changes for `applyChanges`
 */
export function planConflicts(data, entry, conflicts, pending) {
  const index = indexPending(pending.filter((other) => other.seq !== entry.seq));
  const { target } = entry;
  const edited = new Map();
  const edit = (kind, row, field, value) => {
    const key = `${kind}:${JSON.stringify(row.id ?? [row['list-id'], row['task-id']])}`;
    edited.set(key, { kind, row: { ...(edited.get(key)?.row ?? row), [field]: value } });
  };
  for (const conflict of conflicts) {
    const { field, kept } = conflict;
    const names = target.type === 'list' ? LIST_FIELDS : TASK_FIELDS;
    if (field === 'position') {
      const listId = conflict['list-id'] ?? target['list-id'];
      const row = data.memberships.find((m) => m['list-id'] === listId && m['task-id'] === target.id);
      if (row && !index.get(`membership:${membershipKey(listId, target.id)}`)?.fields.has('position')) {
        edit('memberships', row, 'position', kept);
      }
    }
    else if (field === 'text') {
      const row = data.notes.find((note) => note.id === target.id);
      if (row && !index.get(`note:${target.id}`)?.fields.has('text')) {
        edit('notes', row, 'text', kept);
      }
    }
    else if ((target.type === 'list' || target.type === 'task') && names.includes(field)) {
      const row = data[`${target.type}s`].find((candidate) => candidate.id === target.id);
      if (row && !index.get(`${target.type}:${target.id}`)?.fields.has(field)) {
        edit(`${target.type}s`, row, field, kept);
      }
    }
  }
  const changes = { put: {} };
  for (const { kind, row } of edited.values()) {
    (changes.put[kind] ??= []).push(row);
  }
  return changes;
}

/**
 * Plan the rebuild after the service expired the cursor (`410`): rows that came from the service go, never-uploaded rows stay.
 * A row with a queued change loses only its revision, so the new snapshot merges into it and keeps the queued fields.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the local snapshot
 * @param {object[]} pending the queue entries
 * @returns {object} the changes for `applyChanges`
 */
export function planReset(data, pending) {
  const index = indexPending(pending);
  const fromService = (row) => row.revision !== undefined;
  const queued = (key) => index.has(key);
  const changes = { put: { lists: [], tasks: [], memberships: [], notes: [] }, delete: { lists: [], tasks: [], memberships: [], notes: [] } };
  const droppedLists = new Set();
  const droppedTasks = new Set();
  const settle = (kind, key, row, bucket) => {
    if (!fromService(row)) {
      return;
    }
    if (queued(key)) {
      changes.put[kind].push({ ...row, revision: undefined });
    }
    else {
      bucket.add(row.id);
    }
  };
  data.lists.forEach((row) => settle('lists', `list:${row.id}`, row, droppedLists));
  data.tasks.forEach((row) => settle('tasks', `task:${row.id}`, row, droppedTasks));
  changes.delete.lists = [...droppedLists];
  changes.delete.tasks = [...droppedTasks];
  for (const row of data.memberships) {
    const key = membershipKey(row['list-id'], row['task-id']);
    if (droppedLists.has(row['list-id']) || droppedTasks.has(row['task-id']) || (fromService(row) && !queued(`membership:${key}`))) {
      changes.delete.memberships.push([row['list-id'], row['task-id']]);
    }
    else if (fromService(row)) {
      changes.put.memberships.push({ ...row, revision: undefined });
    }
  }
  for (const row of data.notes) {
    if (droppedTasks.has(row['task-id']) || (fromService(row) && !queued(`note:${row.id}`))) {
      changes.delete.notes.push([row['task-id'], row.id]);
    }
    else if (fromService(row)) {
      changes.put.notes.push({ ...row, revision: undefined });
    }
  }
  return changes;
}

/**
 * Plan the data left after disconnecting (`CON-8`, `CON-9`): own lists and tasks stay as local data, the rest goes.
 * Kept rows lose their service fields, so a later connect adopts them like local data.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the local snapshot
 * @param {number|string|null} userId the user who disconnects
 * @returns {object} the changes for `applyChanges`
 */
export function planDisconnect(data, userId) {
  const gone = {
    lists: new Set(data.lists.filter((list) => !ownsList(list, userId)).map((list) => list.id)),
    tasks: new Set(data.tasks.filter((task) => !ownsTask(task, userId)).map((task) => task.id)),
  };
  const strip = (row, ...names) => Object.fromEntries(Object.entries(row).filter(([name]) => !['revision', ...names].includes(name)));
  const kept = (rows, set) => rows.filter((row) => !set.has(row.id));
  const memberships = data.memberships.filter((row) => !gone.lists.has(row['list-id']) && !gone.tasks.has(row['task-id']));
  const notes = data.notes.filter((row) => !gone.tasks.has(row['task-id']));
  return {
    put: {
      lists: kept(data.lists, gone.lists).map((row) => strip(row, 'role', 'sharing')),
      tasks: kept(data.tasks, gone.tasks).map((row) => strip(row)),
      memberships: memberships.map((row) => strip(row)),
      notes: notes.map((row) => strip(row)),
    },
    delete: {
      lists: [...gone.lists],
      tasks: [...gone.tasks],
      memberships: data.memberships.filter((row) => !memberships.includes(row)).map((row) => [row['list-id'], row['task-id']]),
      notes: data.notes.filter((row) => !notes.includes(row)).map((row) => [row['task-id'], row.id]),
    },
  };
}
