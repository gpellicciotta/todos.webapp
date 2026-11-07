/**
 * Test double for the ToDo's service with a change feed: one user, one revision counter, per-field edit times, and tombstones.
 * Rows carry a `revision`; `GET /api/changes` pages them in revision order and answers `410` for a cursor outside the history.
 * Cursors read `c{{revision}}`. `fail` decides per call whether to answer an error status or refuse the connection.
 */

const MERGED = {
  lists: ['name', 'description', 'deletion-time'],
  tasks: ['description', 'status', 'due-time', 'overdue-handling', 'deletion-time'],
};
const USER = { id: 7, email: 'ada@example.com', name: 'Ada' };

/**
 * Create the fake service.
 * @param {object} [options] the options
 * @param {number} [options.protocol] the sync protocol the feed reports
 * @returns {object} the service with `fetch`, `calls`, the row maps, `purge`, `revoke`, `expire`, and the `fail` hook
 */
export function fakeFeed({ protocol = 1 } = {}) {
  const service = {
    revision: 100,
    floor: 0,
    protocol,
    lists: new Map(),
    tasks: new Map(),
    memberships: new Map(),
    notes: new Map(),
    tombstones: [],
    calls: [],
    fail: () => null,
  };
  const next = () => {
    service.revision += 1;
    return service.revision;
  };
  const answer = (status, body = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });
  const view = (row) => Object.fromEntries(Object.entries(row).filter(([name]) => name !== 'edit-times'));

  /**
   * Apply the mergeable fields of a body by their edit times, and report the fields that lost.
   * @param {'lists'|'tasks'} kind the row kind
   * @param {object} row the stored row
   * @param {object} body the update
   * @param {string|undefined} editTime the `Edit-Time` header
   * @returns {object[]} the conflicts
   */
  function merge(kind, row, body, editTime) {
    const conflicts = [];
    const times = body['edit-times'] ?? {};
    for (const field of MERGED[kind].filter((name) => name in body)) {
      const time = times[field] ?? editTime ?? new Date().toISOString();
      if (time >= (row['edit-times'][field] ?? row['creation-time'])) {
        row[field] = body[field];
        row['edit-times'][field] = time;
      }
      else {
        conflicts.push({ field, sent: body[field], kept: row[field], 'kept-edit-time': row['edit-times'][field] });
      }
    }
    row.revision = next();
    return conflicts;
  }

  const create = (rows, body, defaults) => {
    if (rows.has(body.id)) {
      return { status: 200, body: view(rows.get(body.id)) };
    }
    const row = { ...defaults, ...body, 'edit-times': {}, revision: next() };
    delete row.lists;
    rows.set(row.id, row);
    return { status: 201, body: view(row) };
  };

  /**
   * Answer the change feed.
   * @param {URLSearchParams} query the query
   * @returns {{status: number, body?: object}} the reply
   */
  function changes(query) {
    const given = query.get('cursor');
    const from = given ? Number(given.slice(1)) : 0;
    if (given && (from < service.floor || from > service.revision)) {
      return { status: 410 };
    }
    const size = Number(query.get('page-size') ?? 200);
    const all = [
      ...[...service.lists.values()].map((row) => ({ kind: 'lists', row })),
      ...[...service.tasks.values()].map((row) => ({ kind: 'tasks', row })),
      ...[...service.memberships.values()].map((row) => ({ kind: 'memberships', row })),
      ...[...service.notes.values()].map((row) => ({ kind: 'notes', row })),
      ...(given ? service.tombstones.map((row) => ({ kind: 'tombstones', row })) : []),
    ].filter(({ row }) => row.revision > from).sort((a, b) => a.row.revision - b.row.revision);
    const page = all.slice(0, size);
    const more = all.length > page.length;
    const body = { lists: [], tasks: [], memberships: [], notes: [], tombstones: [], protocol: service.protocol, 'has-more': more };
    for (const { kind, row } of page) {
      body[kind].push(kind === 'tombstones' ? row : view(row));
    }
    body.cursor = `c${more ? page.at(-1).row.revision : service.revision}`;
    return { status: 200, body };
  }

  /**
   * Handle one request.
   * @param {string} method the HTTP method
   * @param {URL} url the URL
   * @param {object} body the parsed body
   * @param {object} headers the request headers
   * @returns {{status: number, body?: object}} the reply
   */
  function route(method, url, body, headers) {
    const [kind, id, sub, subId] = url.pathname.split('/').slice(2);
    if (kind === 'changes') {
      return changes(url.searchParams);
    }
    if (kind === 'users' && id === 'me') {
      return { status: 200, body: USER };
    }
    if (kind === 'lists' && !id) {
      return create(service.lists, body, { owner: USER, role: 'owner', description: '', 'deletion-time': null, sharing: [], 'last-update-time': body['creation-time'] });
    }
    if (kind === 'lists' && sub === 'tasks') {
      const key = `${id}/${subId}`;
      if (method === 'DELETE') {
        service.memberships.delete(key);
        service.tombstones.push({ type: 'membership', id: subId, 'list-id': id, reason: 'removed', revision: next(), time: new Date().toISOString() });
      }
      else if (!service.memberships.has(key)) {
        service.memberships.set(key, { 'list-id': id, 'task-id': subId, position: body.position ?? 'a0', revision: next() });
      }
      return { status: 200, body: view(service.tasks.get(subId) ?? {}) };
    }
    if (kind === 'lists') {
      const list = service.lists.get(id);
      const patch = body.delete ? { 'deletion-time': headers['Edit-Time'] } : body;
      return list ? { status: 200, body: { ...view(list), conflicts: merge('lists', list, patch, headers['Edit-Time']) } } : { status: 404 };
    }
    if (kind === 'tasks' && !id) {
      const reply = create(service.tasks, body, { 'owner-id': USER.id, status: 'todo', 'due-time': null, 'overdue-handling': 'keep', 'deletion-time': null, 'last-update-time': body['creation-time'], 'last-activity-time': body['creation-time'] });
      for (const listId of reply.status === 201 ? body.lists ?? [] : []) {
        service.memberships.set(`${listId}/${body.id}`, { 'list-id': listId, 'task-id': body.id, position: 'a0', revision: next() });
      }
      return reply;
    }
    if (kind === 'tasks' && sub === 'notes') {
      return create(service.notes, { ...body, 'task-id': id, 'author-id': USER.id }, {});
    }
    const task = service.tasks.get(id);
    if (kind === 'tasks' && task) {
      const patch = method === 'DELETE' ? { 'deletion-time': headers['Edit-Time'] } : body;
      return { status: 200, body: { ...view(task), conflicts: merge('tasks', task, patch, headers['Edit-Time']) } };
    }
    return { status: 404 };
  }

  service.fetch = async (url, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      path: `${new URL(url).pathname}${new URL(url).search}`,
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    service.calls.push(call);
    const failure = service.fail(call);
    if (failure === 'network') {
      throw new TypeError('Failed to fetch');
    }
    if (typeof failure === 'number') {
      return answer(failure);
    }
    const reply = route(call.method, new URL(url), call.body ?? {}, call.headers);
    return answer(reply.status, reply.body);
  };

  /**
   * Seed a task as another user's, visible through a membership.
   * @param {object} task the task fields
   * @param {string[]} listIds the lists that hold it
   */
  service.seedTask = (task, listIds = []) => {
    service.tasks.set(task.id, {
      status: 'todo', 'due-time': null, 'overdue-handling': 'keep', 'deletion-time': null, 'last-activity-time': task['creation-time'], 'last-update-time': task['creation-time'], ...task, 'edit-times': {}, revision: next(),
    });
    for (const listId of listIds) {
      service.memberships.set(`${listId}/${task.id}`, { 'list-id': listId, 'task-id': task.id, position: 'a0', revision: next() });
    }
  };
  /** Remove a row for good and record the tombstone. */
  service.purge = (type, id) => {
    service[`${type}s`].delete(id);
    service.tombstones.push({ type, id, 'list-id': null, reason: 'purged', revision: next(), time: new Date().toISOString() });
  };
  /** Take a list away from the user, as a revoked share does. */
  service.revoke = (listId) => {
    service.lists.delete(listId);
    for (const key of [...service.memberships.keys()].filter((candidate) => candidate.startsWith(`${listId}/`))) {
      service.memberships.delete(key);
    }
    service.tombstones.push({ type: 'list', id: listId, 'list-id': null, reason: 'access-lost', revision: next(), time: new Date().toISOString() });
  };
  /** Raise the tombstone floor past every cursor issued so far. */
  service.expire = () => {
    service.tombstones = [];
    service.floor = service.revision;
  };
  return service;
}

export const feedUser = USER;
