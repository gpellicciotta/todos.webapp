/**
 * Gallery behavior: the theme switch, live token values, and the motion demo.
 * Component behavior specimens live in visual-style-gallery-behaviors.js.
 *
 * The theme switch sets `data-theme` on <html>, or removes it to follow the system theme.
 */

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Format a computed color as `#rrggbb`, or `#rrggbbaa` when it is translucent.
 * @param {string} color computed color in `rgb()` or `rgba()` form
 * @returns {string} the hex color, or the input when it has another form
 */
export function toHex(color) {
  const match = color.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/);
  if (!match) {
    return color;
  }
  const channels = match.slice(1, 4).map(Number);
  if (match[4] !== undefined && Number(match[4]) < 1) {
    channels.push(Math.round(Number(match[4]) * 255));
  }
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Show each swatch's current color and each listed token's value.
 */
function showValues() {
  const styles = getComputedStyle(root);
  for (const swatch of document.querySelectorAll('.swatch')) {
    const chip = swatch.querySelector('.swatch__chip');
    const value = swatch.querySelector('.swatch__value');
    value.textContent = toHex(getComputedStyle(chip).backgroundColor);
  }
  for (const element of document.querySelectorAll('[data-token]')) {
    element.textContent = styles.getPropertyValue(element.dataset.token).trim();
  }
}

/**
 * Apply a theme choice from the switch.
 * @param {'system'|'light'|'dark'} theme the chosen theme
 */
function applyTheme(theme) {
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  }
  else {
    root.setAttribute('data-theme', theme);
  }
  showValues();
}

for (const input of document.querySelectorAll('.theme-switch input[name="theme"]')) {
  input.addEventListener('change', () => applyTheme(input.value));
}
systemDark.addEventListener('change', showValues);

const motion = document.querySelector('.motion');
const play = motion.querySelector('.gallery-button');
play.addEventListener('click', () => {
  const playing = play.getAttribute('aria-pressed') !== 'true';
  play.setAttribute('aria-pressed', String(playing));
  motion.dataset.state = playing ? 'end' : 'start';
});

// Browsers may restore a checked radio on reload, so start from the checked one.
applyTheme(document.querySelector('.theme-switch input:checked')?.value ?? 'system');
