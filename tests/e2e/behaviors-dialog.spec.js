import { expect, test } from '@playwright/test';

// Working dialog and toast specimens of the gallery, driven by src/js/ui/dialog.js, toast.js, and live-region.js.
const GALLERY = '/demo/visual-style-gallery.html';

/**
 * Collect console errors, page errors, failed requests, and HTTP errors of a page.
 * @param {import('@playwright/test').Page} page page to watch
 * @returns {string[]} live problem list
 */
function watch(page) {
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
  return problems;
}

test.describe('dialog behavior', () => {
  test('keyboard alone opens the modal, keeps Tab inside, and closes it with Escape and a button', async ({ page }) => {
    const problems = watch(page);
    await page.goto(GALLERY);
    const opener = page.locator('[data-open-dialog="dialog-modal"]');
    const dialog = page.locator('#dialog-modal');
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    const confirm = dialog.getByRole('button', { name: 'Import' });

    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel, 'Tab wraps to the first control').toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(confirm, 'Shift+Tab wraps to the last control').toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('#dialog-demo-result')).toHaveText('Closed with: cancel');

    await page.keyboard.press('Enter');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('#dialog-demo-result')).toHaveText('Closed with: import');

    expect(problems).toEqual([]);
  });

  test('the modal fills the viewport height as a sheet at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(GALLERY);
    await page.locator('[data-open-dialog="dialog-modal"]').focus();
    await page.keyboard.press('Enter');
    const box = await page.locator('#dialog-modal').boundingBox();
    expect(Math.round(box.height)).toBe(844);
    expect(Math.round(box.width)).toBe(390);
  });
});

test.describe('toast behavior', () => {
  test('keyboard alone shows a toast, reaches its Undo, and undoes', async ({ page }) => {
    const problems = watch(page);
    await page.goto(GALLERY);
    const show = page.locator('#toast-demo-trigger');
    const toast = page.locator('#toast-demo-region .toast');

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(toast).toHaveCount(1);
    await expect(toast).toHaveText(/Task moved to the recycle bin\./);
    await expect(page.locator('[aria-live="polite"]')).toHaveText('Task moved to the recycle bin.');

    await page.keyboard.press('Tab');
    await expect(toast.getByRole('button', { name: 'Undo' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#toast-demo-result')).toHaveText('Last toast: undone');
    await expect(show, 'focus returns to the control before the toast').toBeFocused();
    await expect(toast).toHaveText('Task restored.');

    expect(problems).toEqual([]);
  });

  test('Escape inside a toast dismisses it and returns focus', async ({ page }) => {
    await page.goto(GALLERY);
    const show = page.locator('#toast-demo-trigger');
    await show.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(page.locator('#toast-demo-region .toast')).toHaveCount(0);
    await expect(show).toBeFocused();
    await expect(page.locator('#toast-demo-result')).toHaveText('Last toast: escape');
  });

  test('a toast expires after 8 seconds', async ({ page }) => {
    // The installed clock flows in real time until paused; pause it so only runFor advances it.
    await page.clock.install({ time: new Date('2026-11-04T10:00:00Z') });
    await page.goto(GALLERY);
    await page.clock.pauseAt(new Date('2026-11-04T10:01:00Z'));
    await page.locator('#toast-demo-trigger').click();
    await page.mouse.move(0, 0);
    const toast = page.locator('#toast-demo-region .toast');
    await expect(toast).toHaveCount(1);
    await page.clock.runFor(7_900);
    await expect(toast).toHaveCount(1);
    await page.clock.runFor(200);
    await expect(toast).toHaveCount(0);
    await expect(page.locator('#toast-demo-result')).toHaveText('Last toast: timeout');
  });
});
