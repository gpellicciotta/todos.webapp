/**
 * Test double for the ToDo's REST API: keeps lists, tasks, memberships, and notes in memory and records every call.
 * Creates are idempotent by identifier, like the service. `fail` decides per call whether to answer an error status,
 * or to apply the call and then lose the reply (`'lost-reply'`), or to refuse the connection (`'network'`).
 */

const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * Create the fake service.
 * @param {object} [seed] initial rows
 * @param {object[]} [seed.lists] account lists
 * @returns {object} the service with `fetch`, `calls`, the row maps, and the `fail` hook
 */
export function fakeService({ lists = [] } = {}) {
  const service = {
    lists: new Map(lists.map((list) => [list.id, { 'deletion-time': null, role: 'owner', ...list }])),
    tasks: new Map(),
    memberships: new Map(),
    notes: new Map(),
    calls: [],
    created: 0,
    fail: () => null,
  };

  const answer = (status, body = {}, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => ({ ...JSON_HEADERS, ...headers })[name.toLowerCase()] ?? null },
    json: async () => body,
  });

  /**
   * Handle one request.
   * @param {string} method the HTTP method
   * @param {string[]} parts the path segments after `/api`
   * @param {object} body the parsed body
   * @returns {{status: number, body?: object}} the reply
   */
  function route(method, parts, body) {
    const [kind, id, sub, subId] = parts;
    if (kind === 'changes') {
      return { status: 200, body: { cursor: 'c1', 'has-more': false, lists: [...service.lists.values()], tasks: [], memberships: [], notes: [], tombstones: [], protocol: 1 } };
    }
    if (kind === 'lists' && !id) {
      return createRow(service.lists, body, { 'deletion-time': null, role: 'owner' }, (list) => [...service.lists.values()].some((other) => other.id !== list.id && other.name.toLowerCase() === list.name.toLowerCase()));
    }
    if (kind === 'lists' && sub === 'tasks') {
      return membership(method, id, subId, body);
    }
    if (kind === 'lists') {
      const list = service.lists.get(id);
      if (!list) {
        return { status: 404 };
      }
      if (body.delete) {
        list['deletion-time'] = 'deleted';
      }
      else if (body['undo-delete']) {
        list['deletion-time'] = null;
      }
      else {
        Object.assign(list, ...['name', 'description'].filter((field) => field in body).map((field) => ({ [field]: body[field] })));
      }
      return { status: 200, body: list };
    }
    if (kind === 'tasks' && !id) {
      return createRow(service.tasks, body, { 'deletion-time': null }, null, (task) => (body.lists ?? []).forEach((listId) => service.memberships.set(`${listId}/${task.id}`, { 'list-id': listId, 'task-id': task.id })));
    }
    if (kind === 'tasks' && sub === 'notes') {
      return notes(method, id, subId, body);
    }
    if (kind === 'tasks') {
      const task = service.tasks.get(id);
      if (!task) {
        return { status: 404 };
      }
      if (method === 'DELETE') {
        task['deletion-time'] = 'deleted';
      }
      else if (sub === 'restore') {
        task['deletion-time'] = null;
      }
      else {
        Object.assign(task, ...['description', 'status', 'due-time', 'overdue-handling'].filter((field) => field in body).map((field) => ({ [field]: body[field] })));
      }
      return { status: 200, body: task };
    }
    return { status: 404 };
  }

  /**
   * Create a row unless its identifier exists; a repeat answers 200 with the stored row.
   * @param {Map} rows the rows by identifier
   * @param {object} body the new row
   * @param {object} defaults the default fields
   * @param {Function|null} clash tells whether the row clashes with another by name
   * @param {Function} [after] called for a new row
   * @returns {{status: number, body: object}} the reply
   */
  function createRow(rows, body, defaults, clash, after) {
    if (rows.has(body.id)) {
      return { status: 200, body: rows.get(body.id) };
    }
    if (clash?.(body)) {
      return { status: 409 };
    }
    const row = { ...defaults, ...body };
    delete row.lists;
    rows.set(row.id, row);
    service.created += 1;
    after?.(row);
    return { status: 201, body: row };
  }

  /**
   * Handle the membership routes.
   * @param {string} method the HTTP method
   * @param {string} listId the list
   * @param {string} taskId the task
   * @param {object} body the body
   * @returns {{status: number, body?: object}} the reply
   */
  function membership(method, listId, taskId, body) {
    const key = `${listId}/${taskId}`;
    if (!service.lists.has(listId) || !service.tasks.has(taskId)) {
      return { status: 404 };
    }
    if (method === 'DELETE') {
      return service.memberships.delete(key) ? { status: 200, body: service.tasks.get(taskId) } : { status: 404 };
    }
    if (!service.memberships.has(key)) {
      service.memberships.set(key, { 'list-id': listId, 'task-id': taskId, ...body });
    }
    return { status: 200, body: service.tasks.get(taskId) };
  }

  /**
   * Handle the note routes.
   * @param {string} method the HTTP method
   * @param {string} taskId the task
   * @param {string} noteId the note
   * @param {object} body the body
   * @returns {{status: number, body?: object}} the reply
   */
  function notes(method, taskId, noteId, body) {
    if (!service.tasks.has(taskId)) {
      return { status: 404 };
    }
    if (method === 'POST') {
      return createRow(service.notes, { ...body, 'task-id': taskId }, {}, null);
    }
    const note = service.notes.get(noteId);
    if (!note) {
      return { status: 404 };
    }
    if (method === 'DELETE') {
      service.notes.delete(noteId);
      return { status: 200, body: {} };
    }
    note.text = body.text;
    return { status: 200, body: note };
  }

  service.fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const { pathname } = new URL(url);
    const call = {
      method,
      path: pathname,
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    service.calls.push(call);
    const failure = service.fail(call);
    if (failure === 'network') {
      throw new TypeError('Failed to fetch');
    }
    if (typeof failure === 'object' && failure !== null) {
      return answer(failure.status, failure.body, failure.headers);
    }
    if (typeof failure === 'number') {
      return answer(failure);
    }
    const reply = route(method, pathname.split('/').slice(2), call.body ?? {});
    if (failure === 'lost-reply') {
      throw new TypeError('Failed to fetch');
    }
    return answer(reply.status, reply.body);
  };
  return service;
}

/**
 * Create a session stand-in that is connected to one account.
 * @param {object} [overrides] fields to override
 * @returns {object} the session
 */
export function fakeSession(overrides = {}) {
  const session = {
    status: 'connected',
    expired: 0,
    state: () => session.status,
    token: () => (session.status === 'connected' ? 'token-1' : null),
    account: () => ({ name: 'Ada', email: 'ada@example.com', server: 'https://todos.example.com' }),
    serverUrl: () => 'https://todos.example.com',
    expire() {
      session.expired += 1;
      session.status = 'sign-in-needed';
    },
    subscribe: () => () => {},
    ...overrides,
  };
  return session;
}
