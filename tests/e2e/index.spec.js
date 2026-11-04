import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'compact', width: 390, height: 844 },
  { name: 'wide', width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  test(`index page loads cleanly at ${viewport.width} px`, async ({ page }) => {
    const problems = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        problems.push(`console: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
    page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        problems.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto('/');

    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle("All tasks · ToDo's");
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('All tasks');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(problems).toEqual([]);
  });
}
