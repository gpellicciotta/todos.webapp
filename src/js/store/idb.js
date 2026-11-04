/**
 * IndexedDB helpers shared by the store modules: store names, errors, requests, and transactions.
 */

/** Object store names. */
export const STORES = {
  lists: 'lists',
  tasks: 'tasks',
  memberships: 'memberships',
  notes: 'notes',
};

/** A store operation failed; `code` names the reason, such as `not-found`. */
export class StoreError extends Error {
  /**
   * @param {string} code machine-readable reason
   * @param {string} message human-readable message
   */
  constructor(code, message) {
    super(message);
    this.name = 'StoreError';
    this.code = code;
  }
}

/** An input value is invalid; `field` names the input field, `code` the rule it broke. */
export class ValidationError extends StoreError {
  /**
   * @param {string} field the invalid field
   * @param {string} code the broken rule: `required`, `too-long`, `invalid`, or `duplicate`
   * @param {string} message human-readable message
   */
  constructor(field, code, message) {
    super(code, message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Return a promise for the result of an IndexedDB request.
 * @param {IDBRequest} req the request
 * @returns {Promise<any>} its result
 */
export function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Run `work` in one transaction and resolve with its result once the transaction commits.
 * An exception from `work` aborts the transaction, so no partial change is stored.
 * @param {IDBDatabase} db the database
 * @param {string[]} storeNames the stores the transaction covers
 * @param {IDBTransactionMode} mode `readonly` or `readwrite`
 * @param {(tx: IDBTransaction) => Promise<any>} work the operations
 * @returns {Promise<any>} the result of `work`
 */
export async function transact(db, storeNames, mode, work) {
  const tx = db.transaction(storeNames, mode);
  const committed = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new StoreError('aborted', 'Transaction aborted'));
  });
  let result;
  try {
    result = await work(tx);
  }
  catch (error) {
    try {
      tx.abort();
    }
    catch {
      // The transaction already finished or aborted.
    }
    committed.catch(() => {});
    throw error;
  }
  await committed;
  return result;
}
