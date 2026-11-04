import { expect, test } from '@playwright/test';

// Working menu and popover specimens of the gallery, driven by src/js/ui/menu.js and popover.js.
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

test.describe('menu behavior', () => {
  test('keyboard alone opens, moves through, selects in, and closes the working menu', async ({ page }) => {
    const problems = watch(page);
    await page.goto(GALLERY);
    const trigger = page.locator('#menu-demo-trigger');
    const menu = page.locator('#menu-demo');
    const item = (name) => menu.getByRole('menuitem', { name, exact: true });

    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(menu).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(item('Add to list')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(item('Remove from this list')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(item('Move up')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(item('Delete'), 'the disabled Move down is skipped').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(item('Add to list'), 'ArrowDown wraps to the first item').toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(item('Delete'), 'ArrowUp wraps to the last item').toBeFocused();
    await page.keyboard.press('Home');
    await expect(item('Add to list')).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowUp');
    await expect(item('Move up')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#menu-demo-result')).toHaveText('Last action: Move up');

    await page.keyboard.press('Space');
    await expect(item('Add to list')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(item('Delete')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menu).toBeHidden();
    const inMenu = await page.evaluate(() => document.activeElement.closest('#menu-demo') !== null);
    expect(inMenu).toBe(false);
    await expect(trigger).not.toBeFocused();

    expect(problems).toEqual([]);
  });

  test('an outside click closes the menu and returns focus to the trigger', async ({ page }) => {
    await page.goto(GALLERY);
    const trigger = page.locator('#menu-demo-trigger');
    await trigger.click();
    await expect(page.locator('#menu-demo')).toBeVisible();
    await page.locator('#menu-title').click();
    await expect(page.locator('#menu-demo')).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('the menu opens anchored below its trigger inside a 390 px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(GALLERY);
    const trigger = page.locator('#menu-demo-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const triggerBox = await trigger.boundingBox();
    const menuBox = await page.locator('#menu-demo').boundingBox();
    expect(menuBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
    expect(menuBox.x).toBeGreaterThanOrEqual(0);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390);
  });
});

test.describe('popover behavior', () => {
  test('keyboard alone opens the filter popover, sets a filter, and closes it', async ({ page }) => {
    const problems = watch(page);
    await page.goto(GALLERY);
    const chip = page.locator('#popover-demo-trigger');
    const popover = page.locator('#popover-demo');

    await expect(popover).toBeHidden();
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(popover).toBeVisible();
    await expect(chip).toHaveAttribute('aria-expanded', 'true');
    await expect(popover.getByRole('checkbox', { name: 'To do' })).toBeFocused();

    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(chip).toHaveText('Status: To do, In progress');

    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(chip).toBeFocused();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+Tab');
    await expect(chip, 'Shift+Tab from the first control returns to the chip').toBeFocused();
    await expect(popover).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(popover).toBeHidden();

    await page.keyboard.press('Enter');
    for (let presses = 0; presses < 4; presses++) {
      await page.keyboard.press('Tab');
    }
    await expect(popover.getByRole('button', { name: 'Clear' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(chip).toHaveText('Status');
    await page.keyboard.press('Tab');
    await expect(popover, 'Tab out of the panel closes it').toBeHidden();

    expect(problems).toEqual([]);
  });

  test('an outside click closes the popover', async ({ page }) => {
    await page.goto(GALLERY);
    await page.locator('#popover-demo-trigger').click();
    await expect(page.locator('#popover-demo')).toBeVisible();
    await page.locator('#popover-title').click();
    await expect(page.locator('#popover-demo')).toBeHidden();
    await expect(page.locator('#popover-demo-trigger')).toBeFocused();
  });
});
