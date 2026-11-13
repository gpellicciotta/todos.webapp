/** Shared System, Light, and Dark preferences; System delegates to the stylesheet media query. */
export const themes = ['light', 'dark', 'system'];

/** Apply a validated theme without accessing storage. */
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
}

/**
 * Enhance existing theme radios. The app name is required to isolate preferences on shared origins.
 * `getStorage` may throw; changes still apply, and `onChange(theme, saved)` reports persistence failures.
 * Pass `onChange` to refresh computed token displays or report a failed save.
 * The returned controller exposes `setTheme`, `getTheme`, and `destroy`.
 */
export function attachThemeSwitch(element, options = {}) {
    const doc = options.document ?? element.ownerDocument;
    const { appName, onChange } = options;
    if (typeof appName !== 'string' || !appName.trim()) {
        throw new TypeError('A nonempty appName is required.');
    }
    const getStorage = options.getStorage ?? (() => doc.defaultView.localStorage);
    const key = `${appName}.theme`;
    const radios = [...element.querySelectorAll('input[name="theme"]')];
    let current = options.initialTheme ?? 'system';
    try {
        const stored = getStorage()?.getItem(key);
        if (themes.includes(stored)) {
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
    function setTheme(theme) {
        render(theme);
        let saved = false;
        try {
            const storage = getStorage();
            if (storage) {
                storage.setItem(key, theme);
                saved = true;
            }
        }
        catch {
            // Report the failure through the caller's localized feedback.
        }
        onChange?.(theme, saved);
        return saved;
    }
    const change = event => {
        if (event.target.checked) {
            setTheme(event.target.value);
        }
    };
    render(current);
    for (const radio of radios) {
        radio.addEventListener('change', change);
    }
    return {
        setTheme,
        getTheme: () => current,
        destroy() {
            for (const radio of radios) {
                radio.removeEventListener('change', change);
            }
        }
    };
}
