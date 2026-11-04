import { expect, test } from '@playwright/test';

const GALLERY = '/demo/visual-style-gallery.html';
const FONT_FILE = '/fonts/InterVariable.woff2';

const VIEWPORTS = [
  { name: 'compact', width: 390, height: 844 },
  { name: 'wide', width: 1440, height: 900 },
];

const THEMES = [
  { name: 'light', label: 'Light', dark: false },
  { name: 'dark', label: 'Dark', dark: true },
];

const TOKEN_GROUPS = ['Color', 'Typography', 'Spacing', 'Radii', 'Sizes', 'Elevation', 'Layers', 'Motion'];

/**
 * Collect console errors, page errors, failed requests, and HTTP errors of a page.
 * @param {import('@playwright/test').Page} page page to watch
 * @returns {{problems: string[], responses: Map<string, number>}} live problem list and response statuses
 */
function watch(page) {
  const problems = [];
  const responses = new Map();
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`));
  page.on('response', (response) => {
    responses.set(new URL(response.url()).pathname, response.status());
    if (response.status() >= 400) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return { problems, responses };
}

/**
 * Read the relative luminance of the body background.
 * @param {import('@playwright/test').Page} page page to inspect
 * @returns {Promise<number>} luminance from 0 to 1
 */
function bodyLuminance(page) {
  return page.evaluate(() => {
    const probe = document.createElement('canvas').getContext('2d');
    probe.fillStyle = getComputedStyle(document.body).backgroundColor;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3).map((value) => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  });
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`gallery renders cleanly at ${viewport.width} px in the ${theme.name} theme`, async ({ page }) => {
      const { problems, responses } = watch(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: theme.dark ? 'light' : 'dark' });

      const response = await page.goto(GALLERY);
      expect(response.status()).toBe(200);
      await page.getByRole('radio', { name: theme.label }).check();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.name);

      const luminance = await bodyLuminance(page);
      if (theme.dark) {
        expect(luminance).toBeLessThan(0.1);
      }
      else {
        expect(luminance).toBeGreaterThan(0.8);
      }

      for (const group of TOKEN_GROUPS) {
        await expect(page.getByRole('heading', { level: 2, name: group, exact: true })).toBeVisible();
      }

      const fonts = await page.evaluate(async () => {
        await document.fonts.ready;
        return {
          family: getComputedStyle(document.body).fontFamily,
          check: document.fonts.check('16px Inter'),
          loaded: [...document.fonts].some(
            (face) => face.family.replace(/["']/g, '') === 'Inter' && face.status === 'loaded',
          ),
        };
      });
      expect(fonts.family).toMatch(/^["']?Inter["']?,/);
      expect(fonts.check).toBe(true);
      expect(fonts.loaded).toBe(true);
      expect(responses.get(FONT_FILE)).toBe(200);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
      expect(problems).toEqual([]);
    });
  }
}

test('gallery follows the system theme when System is selected', async ({ page }) => {
  const { problems } = watch(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(GALLERY);

  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.getByRole('radio', { name: 'System' }).check();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  expect(await bodyLuminance(page)).toBeLessThan(0.1);

  await page.emulateMedia({ colorScheme: 'light' });
  expect(await bodyLuminance(page)).toBeGreaterThan(0.8);
  expect(problems).toEqual([]);
});
