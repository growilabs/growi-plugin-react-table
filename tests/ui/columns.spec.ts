import { expect, test } from '@playwright/test';
import { gridOf, tableIn } from '../helpers/table';

const headerTexts = async (page: import('@playwright/test').Page, mountId: string): Promise<string[]> =>
  tableIn(page, mountId)
    .locator('thead tr')
    .first()
    .locator('th')
    .allInnerTexts()
    .then((texts) => texts.map((text) => text.trim()));

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('列の操作', () => {
  test('列を隠せる', async ({ page }) => {
    const container = page.locator('#mock-basic');
    await container.getByRole('button', { name: 'Columns', exact: true }).click();

    await container.getByRole('checkbox', { name: 'Type' }).uncheck();

    expect(await headerTexts(page, 'mock-basic')).toEqual(['Name', 'Length']);
    // The cells have to go with the column, not just the header.
    expect((await gridOf(tableIn(page, 'mock-basic')))[0]).toEqual(['Zebra', '2.4m']);
  });

  test('最後の1列は隠せない', async ({ page }) => {
    const container = page.locator('#mock-basic');
    await container.getByRole('button', { name: 'Columns', exact: true }).click();

    await container.getByRole('checkbox', { name: 'Type' }).uncheck();
    await container.getByRole('checkbox', { name: 'Length' }).uncheck();

    // A table with no columns is not a view of anything, so the last one is held open.
    await expect(container.getByRole('checkbox', { name: 'Name' })).toBeDisabled();
  });

  test('列を並べ替えられる', async ({ page }) => {
    const container = page.locator('#mock-basic');
    await container.getByRole('button', { name: 'Columns', exact: true }).click();

    await container.getByRole('button', { name: 'Move Type left' }).click();

    expect(await headerTexts(page, 'mock-basic')).toEqual(['Type', 'Name', 'Length']);
    expect((await gridOf(tableIn(page, 'mock-basic')))[0]).toEqual(['herbivore', 'Zebra', '2.4m']);
  });

  test('列を固定するとスクロールしても残る', async ({ page }) => {
    const container = page.locator('#mock-wide');
    await container.getByRole('button', { name: 'Columns', exact: true }).click();
    await container.getByRole('button', { name: /Keep col1 in view/ }).click();
    await container.getByRole('button', { name: 'Columns', exact: true }).click();

    const firstHeader = tableIn(page, 'mock-wide').locator('thead th').first();
    await expect(firstHeader).toHaveCSS('position', 'sticky');

    // Sticky needs a scroll container to mean anything, so pinning has to create one.
    await expect(container.locator('.grt-scroll')).toHaveCSS('overflow-x', 'auto');
  });

  test('固定していない間はスクロール枠を作らない', async ({ page }) => {
    /*
     * GROWI lets a wide table overflow and scrolls the page. Wrapping every table in a
     * scroll box would change that for pages the plugin was only meant to add controls
     * to — and would drag GROWI's edit button out of view when scrolled sideways.
     */
    await expect(page.locator('#mock-wide .grt-scroll')).toHaveCSS('overflow-x', 'visible');
  });

  test('「Reset columns」で列の状態だけが戻る', async ({ page }) => {
    const container = page.locator('#mock-basic');
    const table = tableIn(page, 'mock-basic');

    await table.locator('thead th', { hasText: 'Name' }).getByRole('button').click();

    await container.getByRole('button', { name: 'Columns', exact: true }).click();
    await container.getByRole('checkbox', { name: 'Type' }).uncheck();
    await container.getByRole('button', { name: 'Reset columns' }).click();

    expect(await headerTexts(page, 'mock-basic')).toEqual(['Name', 'Type', 'Length']);
    // Sorting is a separate choice; resetting the column layout must not undo it.
    await expect(table.locator('thead th', { hasText: 'Name' })).toHaveAttribute('aria-sort', 'ascending');
  });
});

test.describe('ページング', () => {
  test('短い表はページ分割しない', async ({ page }) => {
    await expect(page.locator('#mock-basic').getByRole('navigation', { name: 'Table pages' })).toBeHidden();
    expect(await gridOf(tableIn(page, 'mock-basic'))).toHaveLength(5);
  });

  test('長い表だけがページ分割される', async ({ page }) => {
    const container = page.locator('#mock-long');
    const pager = container.getByRole('navigation', { name: 'Table pages' });

    await expect(pager).toContainText('Page 1 of 3');
    expect(await gridOf(tableIn(page, 'mock-long'))).toHaveLength(100);

    await pager.getByRole('button', { name: 'Next' }).click();
    await expect(pager).toContainText('Page 2 of 3');
  });
});
