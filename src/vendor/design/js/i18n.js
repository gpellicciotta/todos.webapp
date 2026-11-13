/** Shared translations; applications own locale selection and catalog loading. */
let catalog = Object.create(null);

/** Replace the active flat string catalog without retaining caller-owned state. */
export function setCatalog(nextCatalog) {
    if (nextCatalog === null || typeof nextCatalog !== 'object' || Array.isArray(nextCatalog)) {
        throw new TypeError('A translation catalog must be a flat object of strings.');
    }
    const entries = Object.entries(nextCatalog);
    if (entries.some(([, value]) => typeof value !== 'string')) {
        throw new TypeError('Translation catalog values must be strings.');
    }
    catalog = Object.assign(Object.create(null), Object.fromEntries(entries));
}

/** Translate a key and substitute own {name} parameters; retain unknown names. */
export function t(key, params = {}) {
    const text = Object.hasOwn(catalog, key) ? catalog[key] : key;
    return text.replace(/\{([\w-]+)\}/g, (placeholder, name) =>
        Object.hasOwn(params, name) ? String(params[name]) : placeholder);
}

/** Translate a document, element (including itself), or document fragment. */
export function applyTranslations(root = document) {
    const selector = '[data-i18n], [data-i18n-aria], [data-i18n-tooltip], [data-i18n-placeholder]';
    const elements = [...root.querySelectorAll(selector)];
    if (root.matches?.(selector)) {
        elements.unshift(root);
    }
    for (const element of elements) {
        if (element.hasAttribute('data-i18n')) {
            element.textContent = t(element.getAttribute('data-i18n'));
        }
        for (const [source, targets] of [
            ['data-i18n-aria', ['aria-label']],
            ['data-i18n-tooltip', ['data-tooltip', 'title']],
            ['data-i18n-placeholder', ['placeholder']]
        ]) {
            if (element.hasAttribute(source)) {
                const text = t(element.getAttribute(source));
                for (const target of targets) {
                    element.setAttribute(target, text);
                }
            }
        }
    }
}
