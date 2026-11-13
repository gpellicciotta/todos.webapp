/** Sprite icons; apps set the sprite url of their vendored look once, then build icons by name. */
const SVG = 'http://www.w3.org/2000/svg';
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const iconSizes = ['sm', 'md', 'lg'];

let spriteUrl = null;

/**
 * Set the url of the look sprite that every later icon references, such as `vendor/design/looks/neutral/icons.svg`.
 * @param {string} url sprite file url, relative to the page or absolute, without a fragment
 */
export function setSpriteUrl(url) {
    if (typeof url !== 'string' || !url) {
        throw new TypeError('The sprite url must be a non-empty string.');
    }
    if (url.includes('#')) {
        throw new RangeError(`The sprite url must not hold a fragment: ${url}`);
    }
    spriteUrl = url;
}

/**
 * Build `<svg class="icon"><use href="{{sprite}}#icon-{{name}}"/></svg>`, decorative unless labeled.
 * @param {Document} doc document that creates the elements
 * @param {string} name glyph name without the `icon-` prefix, such as `close`
 * @param {object} [options] icon options
 * @param {'sm'|'md'|'lg'} [options.size] size modifier; the plain class draws the md size
 * @param {string} [options.className] extra classes after the icon classes
 * @param {string} [options.label] accessible name of an icon that carries meaning on its own
 * @returns {SVGSVGElement} the icon
 */
export function createIcon(doc, name, { size, className = '', label } = {}) {
    if (typeof name !== 'string' || !NAME.test(name) || name.startsWith('icon-')) {
        throw new RangeError(`Icon names are kebab-case without the icon- prefix: ${name}`);
    }
    if (size !== undefined && !iconSizes.includes(size)) {
        throw new RangeError(`Unknown icon size: ${size}`);
    }
    if (spriteUrl === null) {
        throw new Error('Call setSpriteUrl with the look sprite url before creating icons.');
    }
    const svg = doc.createElementNS(SVG, 'svg');
    svg.setAttribute('class', ['icon', ...(size ? [`icon--${size}`] : []), ...className.split(/\s+/).filter(Boolean)].join(' '));
    if (label) {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', label);
    }
    else {
        svg.setAttribute('aria-hidden', 'true');
    }
    svg.setAttribute('focusable', 'false');
    const use = doc.createElementNS(SVG, 'use');
    use.setAttribute('href', `${spriteUrl}#icon-${name}`);
    svg.append(use);
    return svg;
}

/**
 * Build an icon with todos.webapp's former signature.
 * @deprecated Use `createIcon`; this alias goes away in the next minor release.
 * @param {Document} doc document that creates the elements
 * @param {string} name glyph name without the `icon-` prefix
 * @param {string} [className] full class list, `icon` included
 * @returns {SVGSVGElement} the icon
 */
export function spriteIcon(doc, name, className = 'icon') {
    return createIcon(doc, name, { className: className.split(/\s+/).filter((item) => item !== 'icon').join(' ') });
}
