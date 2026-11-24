/**
 * File download helper: hands the viewer a JSON value or Blob as a named file.
 *
 * - `downloadJson`, `downloadBlob`, and `downloadFile` click a temporary hidden `a[download]` and revoke the object URL
 *   after a short delay so the browser finishes reading the blob after `click()` returns.
 * - `createFileDownload` keeps the object URL alive for later actions, such as a persistent download toast, until
 *   `revoke()` or `destroy()` frees it.
 * - `downloadUrl` triggers a named download for an existing URL without managing object URL lifetime.
 */

const DEFAULT_REVOKE_DELAY = 1000;

/**
 * Tell whether a value is a `Blob` instance in this runtime.
 * @param {unknown} value candidate value
 * @returns {boolean} true when `value` is a `Blob`
 */
function isBlob(value) {
    return typeof Blob !== 'undefined' && value instanceof Blob;
}

/**
 * Serialize a value as formatted JSON in an `application/json` Blob with a trailing newline.
 * @param {unknown} value JSON-serializable value
 * @param {object} [options] formatting options
 * @param {number|string} [options.space] indentation passed to `JSON.stringify`, 2 by default
 * @param {string} [options.type] MIME type, `application/json` by default
 * @returns {Blob} JSON blob
 */
function toJsonBlob(value, { space = 2, type = 'application/json' } = {}) {
    const serialized = JSON.stringify(value, null, space) ?? 'null';
    return new Blob([`${serialized}\n`], { type });
}

/**
 * Normalize a Blob, descriptor (`{ blob }` or `{ json }`), or plain JSON value into a Blob.
 * @param {Blob|{blob: Blob}|{json: unknown, space?: number|string, type?: string}|unknown} source download source
 * @param {object} [options] JSON fallback options
 * @returns {{blob: Blob, isJson: boolean}} normalized blob and whether it was serialized from JSON
 */
function resolveBlob(source, options = {}) {
    if (isBlob(source)) {
        return { blob: source, isJson: false };
    }
    if (source && typeof source === 'object' && isBlob(source.blob)) {
        return { blob: source.blob, isJson: false };
    }
    if (source && typeof source === 'object' && Object.hasOwn(source, 'json')) {
        return {
            blob: toJsonBlob(source.json, { space: source.space ?? options.space, type: source.type ?? options.type }),
            isJson: true
        };
    }
    return { blob: toJsonBlob(source, options), isJson: true };
}

/**
 * Resolve a non-empty download file name.
 * @param {string|undefined} filename requested file name
 * @param {Blob} blob source blob
 * @param {boolean} isJson whether the source was serialized from JSON
 * @returns {string} file name
 */
function resolveFilename(filename, blob, isJson) {
    if (typeof filename === 'string' && filename.trim()) {
        return filename.trim();
    }
    if (typeof File !== 'undefined' && blob instanceof File && blob.name) {
        return blob.name;
    }
    return isJson ? 'download.json' : 'download';
}

/**
 * Trigger a browser download for an existing URL by clicking a temporary hidden `a[download]`.
 * @param {string} href URL to download
 * @param {string} [filename] suggested file name, `download` by default
 * @param {object} [options] environment options
 * @param {Document} [options.document] document to use, the global one by default
 * @returns {boolean} true when the temporary anchor was clicked
 */
export function downloadUrl(href, filename = 'download', options = {}) {
    const doc = options.document ?? globalThis.document;
    const host = doc?.body ?? doc?.documentElement;
    if (!href || !host) {
        return false;
    }
    const link = doc.createElement('a');
    link.setAttribute('href', href);
    link.setAttribute('download', typeof filename === 'string' && filename.trim() ? filename.trim() : 'download');
    link.hidden = true;
    link.setAttribute('data-file-download', '');
    host.append(link);
    try {
        link.click();
    }
    finally {
        link.remove();
    }
    return true;
}

/**
 * Create a file download controller that owns an object URL until `revoke()` or `destroy()` is called.
 * @param {Blob|{blob: Blob}|{json: unknown, space?: number|string, type?: string}|unknown} source Blob or JSON value
 * @param {string} [filename] suggested file name
 * @param {object} [options] environment and formatting options
 * @param {Document} [options.document] document to use, the global one by default
 * @param {{createObjectURL: (blob: Blob) => string, revokeObjectURL: (url: string) => void}} [options.url] URL API, global `URL` by default
 * @param {typeof setTimeout} [options.setTimeout] timer function, for tests
 * @param {typeof clearTimeout} [options.clearTimeout] timer cancel function, for tests
 * @param {number} [options.revokeDelay] default delay in milliseconds for deferred revocation, 1000 by default
 * @param {number|string} [options.space] JSON indentation when serializing, 2 by default
 * @param {string} [options.type] MIME type when serializing JSON, `application/json` by default
 * @returns {{filename: string, blob: Blob, url: string, download: () => boolean, revoke: (options?: {delay?: number, onRevoke?: () => void}) => void, isRevoked: () => boolean, destroy: () => void}}
 *   the file download controller
 */
export function createFileDownload(source, filename, options = {}) {
    const doc = options.document ?? globalThis.document;
    const urlApi = options.url ?? globalThis.URL;
    const set = options.setTimeout ?? globalThis.setTimeout;
    const clear = options.clearTimeout ?? globalThis.clearTimeout;
    const externalUrl = source && typeof source === 'object' && !isBlob(source) && typeof source.url === 'string';
    const { blob, isJson } = externalUrl ? { blob: null, isJson: false } : resolveBlob(source, options);
    const name = resolveFilename(filename ?? source?.filename, blob, isJson);
    const objectUrl = externalUrl ? source.url : urlApi.createObjectURL(blob);
    const ownsUrl = externalUrl ? (source.revoke ?? objectUrl.startsWith('blob:')) : true;
    let revoked = false;
    let timer = null;
    let onRevokeCallback = null;

    /**
     * Revoke the object URL once and notify any pending callback.
     */
    function revokeNow() {
        if (timer !== null) {
            clear(timer);
            timer = null;
        }
        if (revoked) {
            return;
        }
        revoked = true;
        if (ownsUrl) {
            urlApi.revokeObjectURL(objectUrl);
        }
        const callback = onRevokeCallback;
        onRevokeCallback = null;
        callback?.();
    }

    /**
     * Revoke the object URL immediately, or after a delay while the browser starts reading a clicked download.
     * @param {object} [revokeOptions] revocation options
     * @param {number} [revokeOptions.delay] milliseconds to wait before revoking; omits for immediate revocation
     * @param {() => void} [revokeOptions.onRevoke] optional callback fired once revocation completes
     */
    function revoke(revokeOptions = {}) {
        if (revoked) {
            revokeOptions?.onRevoke?.();
            return;
        }
        if (typeof revokeOptions?.onRevoke === 'function') {
            onRevokeCallback = revokeOptions.onRevoke;
        }
        if (typeof revokeOptions?.delay === 'number') {
            if (timer !== null) {
                clear(timer);
            }
            // The browser reads the blob after click() returns, so the URL stays valid briefly.
            timer = set(revokeNow, Math.max(0, revokeOptions.delay));
            return;
        }
        revokeNow();
    }

    /**
     * Click a temporary hidden `a[download]` for this file unless its URL was already revoked.
     * @returns {boolean} true when the download was triggered
     */
    function download() {
        if (revoked) {
            return false;
        }
        return downloadUrl(objectUrl, name, { document: doc });
    }

    return {
        filename: name,
        blob,
        url: objectUrl,
        download,
        revoke,
        isRevoked: () => revoked,
        destroy: () => revoke()
    };
}

/**
 * Hand the viewer a Blob as a named file download and revoke its object URL afterwards.
 * @param {Blob} blob file bytes
 * @param {string} [filename] suggested file name
 * @param {object} [options] options forwarded to `createFileDownload`
 * @returns {ReturnType<typeof createFileDownload>} the download handle
 */
export function downloadBlob(blob, filename, options = {}) {
    const handle = createFileDownload({ blob }, filename, options);
    handle.download();
    handle.revoke({ delay: options.revokeDelay ?? DEFAULT_REVOKE_DELAY });
    return handle;
}

/**
 * Hand the viewer a JSON value as a formatted named file download and revoke its object URL afterwards.
 * @param {unknown} value JSON-serializable value
 * @param {string} [filename] suggested file name, `download.json` by default
 * @param {object} [options] options forwarded to `createFileDownload`
 * @returns {ReturnType<typeof createFileDownload>} the download handle
 */
export function downloadJson(value, filename = 'download.json', options = {}) {
    const blob = toJsonBlob(value, options);
    const name = typeof filename === 'string' && filename.trim() ? filename.trim() : 'download.json';
    return downloadBlob(blob, name, options);
}

/**
 * Hand the viewer either a Blob or a JSON value as a named file download.
 * @param {Blob|unknown} source Blob or JSON value
 * @param {string} [filename] suggested file name
 * @param {object} [options] options forwarded to `downloadBlob` or `downloadJson`
 * @returns {ReturnType<typeof createFileDownload>} the download handle
 */
export function downloadFile(source, filename, options = {}) {
    return isBlob(source) ? downloadBlob(source, filename, options) : downloadJson(source, filename, options);
}
