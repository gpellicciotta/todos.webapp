import { expect, test } from '@playwright/test';
import { installFocusIndicator } from './focus-indicator.js';

// The vendored design system draws focus as a glow on box-shadow (support.webapp 0.2.0).
// Rows and bottom bar items keep their ring inside their edge, since the rows around them would cover an outer glow.

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];

/**
 * Describe the focus drawing of an element: whether it shows an indicator, whether that is an inset contour,
 * and its raw box-shadow.
 * @param {import('@playwright/test').Locator} locator the element
 * @returns {Promise<{ shown: boolean, inset: boolean, shadow: string }>} the focus drawing
 */
function focusOf(locator) {
  return locator.evaluate((element) => {
    const shadow = getComputedStyle(element).boxShadow;
    return { shown: window.focusIndicator(element), inset: /\b0px 0px 0px \d+(?:\.\d+)?px inset/.test(shadow), shadow };
  });
}

for (const viewport of VIEWPORTS) {
  for (const theme of ['light', 'dark']) {
    test(`rows and bottom bar items draw one focus glow inside their edge at ${viewport.width} px in the ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize(viewport);
      await page.goto('/#/tasks');
      await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
      const listId = await page.evaluate(async () => {
        const { openStore } = await import('/js/store/db.js');
        const store = await openStore({ broadcast: true });
        const list = await store.createList({ name: 'Home' });
        await store.createTask({ description: 'Buy paint' }, { lists: [list.id] });
        store.close();
        return list.id;
      });
      await installFocusIndicator(page);
      await page.goto(`/#/lists/${listId}`);
      const open = page.locator('.task-row__open').first();
      await expect(open).toBeVisible();
      await page.keyboard.press('Shift');

      // The task row draws the ring of its open link, so the link itself draws nothing.
      await open.focus();
      const row = await focusOf(page.locator('.task-row').first());
      expect(row.shown, row.shadow).toBe(true);
      expect(row.inset, row.shadow).toBe(true);
      const link = await focusOf(open);
      expect(link.shown, link.shadow).toBe(false);
      expect(link.shadow).toBe('none');

      // A group header toggle spans the list, as a row does.
      await page.locator('.task-row').first().evaluate((element) => element.insertAdjacentHTML('beforebegin',
        '<li class="group-header"><h3 class="group-header__heading"><button class="group-header__toggle" type="button">Today</button></h3></li>'));
      await page.locator('.group-header__toggle').focus();
      const header = await focusOf(page.locator('.group-header__toggle'));
      expect(header.shown, header.shadow).toBe(true);
      expect(header.inset, header.shadow).toBe(true);

      if (viewport.width < 1024) {
        for (const name of ['Tasks', 'Lists']) {
          const item = page.locator('.app__bottom-nav').getByRole('link', { name });
          await item.focus();
          const drawn = await focusOf(item);
          expect(drawn.shown, `${name}: ${drawn.shadow}`).toBe(true);
          expect(drawn.inset, `${name}: ${drawn.shadow}`).toBe(true);
        }
      }

      await page.goto('/#/lists');
      const listRow = page.locator('.list-row').first();
      await expect(listRow).toBeVisible();
      await listRow.focus();
      const list = await focusOf(listRow);
      expect(list.shown, list.shadow).toBe(true);
      expect(list.inset, list.shadow).toBe(true);
    });
  }
}

test('in forced colors mode a focused task row draws its outline in Highlight, as package controls do', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  const listId = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const list = await store.createList({ name: 'Home' });
    await store.createTask({ description: 'Buy paint' }, { lists: [list.id] });
    store.close();
    return list.id;
  });
  await page.goto(`/#/lists/${listId}`);
  const open = page.locator('.task-row__open').first();
  await expect(open).toBeVisible();
  await page.keyboard.press('Shift');
  await open.focus();
  const colors = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'Highlight';
    document.body.append(probe);
    const highlight = getComputedStyle(probe).color;
    probe.remove();
    // A package control with the shared focus rule, for reference.
    const button = document.querySelector('.status-button');
    button.focus({ focusVisible: true });
    const control = getComputedStyle(button).outlineColor;
    document.querySelector('.task-row__open').focus({ focusVisible: true });
    const row = getComputedStyle(document.querySelector('.task-row'));
    return { highlight, control, row: row.outlineColor, style: row.outlineStyle };
  });
  expect(colors.control).toBe(colors.highlight);
  expect(colors.style).toBe('solid');
  expect(colors.row).toBe(colors.highlight);
});

test('the separators draw only their focus line, between the top bar and the action bar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  const route = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const list = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Buy paint' }, { lists: [list.id] });
    store.close();
    return `/#/lists/${list.id}/tasks/${task.id}`;
  });
  await page.goto(route);
  await expect(page.locator('.editor-panel')).toBeVisible();
  const bar = await page.locator('.app__top-bar').boundingBox();
  const action = await page.locator('.app > .app__action-bar').boundingBox();
  for (const name of ['Resize lists sidebar', 'Resize task editor']) {
    const separator = page.getByRole('separator', { name });
    await expect(separator).toBeVisible();
    const box = await separator.boundingBox();
    expect(box.y, name).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
    expect(box.y + box.height, name).toBeLessThanOrEqual(action.y + 1);
    await page.keyboard.press('Shift');
    await separator.focus();
    expect(await separator.evaluate((element) => getComputedStyle(element).boxShadow), name).toBe('none');
  }
});
