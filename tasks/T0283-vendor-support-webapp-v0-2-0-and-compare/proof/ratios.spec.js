// Print the signal table of visual-style-guide.md: each token's hex in both themes and its lowest WCAG ratio.
import { test } from '@playwright/test';

const GROUNDS = ['--color-bg', '--color-surface', '--color-surface-sunken', '--color-surface-hover', '--color-surface-selected'];
const ROWS = [
  ['--color-primary', 'grounds'],
  ['--color-primary-hover', 'on-primary'],
  ['--color-primary-active', 'on-primary'],
  ['--color-on-primary', 'primary'],
  ['--color-link', 'grounds'],
  ['--color-focus', 'grounds'],
  ['--color-danger', 'grounds'],
];

test('signal ratios', async ({ page }) => {
  const out = {};
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    out[theme] = await page.evaluate(([grounds, rows]) => {
      const hex = (token) => {
        const span = document.createElement('span');
        span.style.color = `var(${token})`;
        document.body.append(span);
        const [r, g, b] = getComputedStyle(span).color.match(/\d+/g).map(Number);
        span.remove();
        return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
      };
      const luminance = (value) => {
        const channels = [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
          .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const ratio = (a, b) => {
        const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (high + 0.05) / (low + 0.05);
      };
      return rows.map(([token, against]) => {
        const value = hex(token);
        let lowest;
        if (against === 'grounds') {
          lowest = Math.min(...grounds.map((ground) => ratio(value, hex(ground))));
        }
        else if (against === 'on-primary') {
          lowest = ratio(value, hex('--color-on-primary'));
        }
        else {
          lowest = ratio(value, hex('--color-primary'));
        }
        return { token, value, lowest: lowest.toFixed(2) };
      });
    }, [GROUNDS, ROWS]);
  }
  for (let index = 0; index < ROWS.length; index++) {
    const [light, dark] = [out.light[index], out.dark[index]];
    console.log(`${light.token} | ${light.value} | ${dark.value} | ${light.lowest} / ${dark.lowest}`);
  }
});
