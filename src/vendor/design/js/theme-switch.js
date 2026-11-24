/** Shared System, Light, and Dark preferences; System delegates to the stylesheet media query. */
export const themes = ['light', 'dark', 'system'];

function requireAppName(appName) {
    if (typeof appName !== 'string' || !appName.trim()) {
        throw new TypeError('A nonempty appName is required.');
    }
    return appName.trim();
}

/**
 * Normalize a single theme name; legacy `default` maps to `system`, unknown values return `null`.
 * @param {unknown} value candidate theme name
 * @returns {'light'|'dark'|'system'|null} normalized theme or `null`
 */
export function normalizeTheme(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toLowerCase().replace(/[ _]/g, '-');
    if (normalized === 'default') {
        return 'system';
    }
    return themes.includes(normalized) ? normalized : null;
}

function themeFromStyleSetting(raw) {
    if (typeof raw === 'object' && raw !== null) {
        return normalizeTheme(raw.theme);
    }
    if (typeof raw === 'string') {
        const direct = normalizeTheme(raw);
        if (direct) {
            return direct;
        }
        try {
            const parsed = JSON.parse(raw);
            return typeof parsed === 'object' && parsed !== null ? normalizeTheme(parsed.theme) : null;
        }
        catch {
            return null;
        }
    }
    return null;
}

/**
 * Read a theme from account settings: a `{name, value}` list, a plain object, or a theme string.
 * Prefers `theme` over `style-settings`; maps legacy `default` to `system` and ignores unknown values.
 * @param {object[]|object|string|null|undefined} settings account settings
 * @returns {'light'|'dark'|'system'|null} parsed theme or `null`
 */
export function themeOfSettings(settings) {
    if (typeof settings === 'string') {
        return normalizeTheme(settings);
    }
    if (Array.isArray(settings)) {
        for (const item of settings) {
            if (item?.name === 'theme') {
                const candidate = themeFromStyleSetting(item.value);
                if (candidate) {
                    return candidate;
                }
            }
        }
        for (const item of settings) {
            if (item?.name === 'style-settings') {
                const candidate = themeFromStyleSetting(item.value);
                if (candidate) {
                    return candidate;
                }
            }
        }
        return null;
    }
    if (typeof settings === 'object' && settings !== null) {
        return normalizeTheme(settings.theme) ?? themeFromStyleSetting(settings['style-settings']);
    }
    return null;
}

/**
 * Build a compact classic-script snippet that applies `${appName}.theme` before first paint.
 * Optionally migrates a legacy storage key once without overwriting an existing value; never throws.
 * @param {string} appName application key prefix
 * @param {{legacyKey?: string}} [options] optional migration settings
 * @returns {string} classic JavaScript source for an inline `<script>` in `<head>`
 */
export function themeBootScript(appName, { legacyKey } = {}) {
    const key = `${requireAppName(appName)}.theme`;
    const legacy = typeof legacyKey === 'string' && legacyKey.trim() && legacyKey.trim() !== key ? legacyKey.trim() : null;
    const migrate = legacy
        ? `var o=localStorage.getItem(${JSON.stringify(legacy)});if(o!==null){if((o==='dark'||o==='light')&&localStorage.getItem(k)===null){localStorage.setItem(k,o);}localStorage.removeItem(${JSON.stringify(legacy)});}`
        : '';
    return `(function(){try{var k=${JSON.stringify(key)};${migrate}var s=localStorage.getItem(k);if(s==='dark'||s==='light'){document.documentElement.setAttribute('data-theme',s);var m=document.querySelector('meta[name="color-scheme"]');if(m){m.setAttribute('content',s);}}}catch(e){}})();`;
}

function migrateLegacyKey(storage, key, legacyKey) {
    const legacy = typeof legacyKey === 'string' ? legacyKey.trim() : '';
    if (!storage || !legacy || legacy === key) {
        return;
    }
    const oldTheme = storage.getItem(legacy);
    if (oldTheme !== null) {
        if ((oldTheme === 'dark' || oldTheme === 'light') && storage.getItem(key) === null) {
            storage.setItem(key, oldTheme);
        }
        storage.removeItem(legacy);
    }
}

function saveToStorage(getStorage, key, theme) {
    try {
        const storage = getStorage();
        if (storage) {
            storage.setItem(key, theme);
            return true;
        }
    }
    catch {
        // Report the failure through the caller's localized feedback.
    }
    return false;
}

/** Apply a validated theme without accessing storage, syncing `meta[name="color-scheme"]` if present. */
export function applyTheme(doc, theme) {
    if (!themes.includes(theme)) {
        throw new RangeError(`Unknown theme: ${theme}`);
    }
    if (theme === 'system') {
        doc.documentElement.removeAttribute('data-theme');
    }
    else {
        doc.documentElement.setAttribute('data-theme', theme);
    }
    const meta = doc.querySelector?.('meta[name="color-scheme"]');
    if (meta) {
        meta.setAttribute('content', theme === 'system' ? 'light dark' : theme);
    }
}

/**
 * Apply an account's theme at sign-in without a mounted switch, from preloaded `settings` or `load()`.
 * Unknown or missing themes are ignored; `load()` failures pass to `onError` and resolve to `null`.
 * @param {object} options sync options
 * @returns {Promise<'light'|'dark'|'system'|null>} applied theme, or `null` when none applied
 */
export async function syncAccountTheme(options = {}) {
    const doc = options.document ?? globalThis.document;
    const key = `${requireAppName(options.appName)}.theme`;
    const getStorage = options.getStorage ?? (() => doc.defaultView?.localStorage);
    let raw = options.settings;
    if (raw === undefined && typeof options.load === 'function') {
        try {
            raw = await options.load();
        }
        catch (error) {
            options.onError?.(error, { operation: 'load' });
            return null;
        }
    }
    const theme = themeOfSettings(raw);
    if (!theme) {
        return null;
    }
    applyTheme(doc, theme);
    const saved = saveToStorage(getStorage, key, theme);
    options.onChange?.(theme, saved);
    return theme;
}

/**
 * Enhance existing theme radios. The app name is required to isolate preferences on shared origins.
 * `getStorage` may throw; changes still apply, and `onChange(theme, saved)` reports persistence failures.
 * Pass `sync: { load, save, onError }` to load account settings on `controller.sync()` and save manual changes.
 * The returned controller exposes `setTheme`, `getTheme`, `sync`, and `destroy`.
 */
export function attachThemeSwitch(element, options = {}) {
    const doc = options.document ?? element.ownerDocument;
    const { onChange, legacyKey, sync: accountSync } = options;
    const key = `${requireAppName(options.appName)}.theme`;
    const getStorage = options.getStorage ?? (() => doc.defaultView?.localStorage);
    const radios = [...element.querySelectorAll('input[name="theme"]')];
    let current = options.initialTheme ?? 'system';
    let version = 0;
    let destroyed = false;
    try {
        const storage = getStorage();
        migrateLegacyKey(storage, key, legacyKey);
        const stored = normalizeTheme(storage?.getItem(key));
        if (stored) {
            current = stored;
        }
    }
    catch {
        // Storage may be blocked; the control remains usable for this page.
    }
    function render(theme) {
        applyTheme(doc, theme);
        current = theme;
        for (const radio of radios) {
            radio.checked = radio.value === theme;
        }
    }
    function saveAccount(theme) {
        if (typeof accountSync?.save !== 'function') {
            return;
        }
        try {
            Promise.resolve(accountSync.save(theme)).catch((error) => {
                accountSync.onError?.(error, { operation: 'save', theme });
            });
        }
        catch (error) {
            accountSync.onError?.(error, { operation: 'save', theme });
        }
    }
    function setTheme(theme, { sync = true } = {}) {
        version += 1;
        render(theme);
        const saved = saveToStorage(getStorage, key, theme);
        onChange?.(theme, saved);
        if (sync) {
            saveAccount(theme);
        }
        return saved;
    }
    async function sync(settings) {
        const token = ++version;
        let raw = settings;
        if (raw === undefined && typeof accountSync?.load === 'function') {
            try {
                raw = await accountSync.load();
            }
            catch (error) {
                accountSync.onError?.(error, { operation: 'load' });
                return null;
            }
        }
        if (destroyed || version !== token) {
            return null;
        }
        const theme = themeOfSettings(raw);
        if (!theme) {
            return null;
        }
        render(theme);
        const saved = saveToStorage(getStorage, key, theme);
        onChange?.(theme, saved);
        return theme;
    }
    const change = event => {
        if (event.target.checked) {
            setTheme(event.target.value);
        }
    };
    const onStorage = event => {
        if (event.key !== key) {
            return;
        }
        const next = event.newValue === null ? 'system' : normalizeTheme(event.newValue);
        if (next && next !== current) {
            version += 1;
            render(next);
            onChange?.(next, true);
        }
    };
    render(current);
    for (const radio of radios) {
        radio.addEventListener('change', change);
    }
    const view = doc.defaultView;
    view?.addEventListener?.('storage', onStorage);
    return {
        setTheme,
        getTheme: () => current,
        sync,
        destroy() {
            destroyed = true;
            for (const radio of radios) {
                radio.removeEventListener('change', change);
            }
            view?.removeEventListener?.('storage', onStorage);
        }
    };
}
