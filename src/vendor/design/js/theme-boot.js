/* Apply the stored theme before first paint; optional legacy key migrates once. Never throws. */
(function () {
    try {
        const script = document.currentScript;
        const app = script?.getAttribute('data-theme-switch-app')?.trim();
        if (!app) {
            return;
        }
        const key = `${app}.theme`;
        const legacy = script.getAttribute('data-theme-switch-legacy-key')?.trim();
        if (legacy && legacy !== key) {
            const oldTheme = localStorage.getItem(legacy);
            if (oldTheme !== null) {
                if ((oldTheme === 'dark' || oldTheme === 'light') && localStorage.getItem(key) === null) {
                    localStorage.setItem(key, oldTheme);
                }
                localStorage.removeItem(legacy);
            }
        }
        const saved = localStorage.getItem(key);
        if (saved === 'dark' || saved === 'light') {
            document.documentElement.setAttribute('data-theme', saved);
            document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', saved);
        }
    }
    catch {
        // Storage may be blocked; the page falls back to the system preference.
    }
})();
