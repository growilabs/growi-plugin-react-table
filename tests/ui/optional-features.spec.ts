import { expect, test } from '@playwright/test';
import { columnOf, gridOf, tableIn } from '../helpers/table';

/*
 * Row selection, row pinning and grouping turn a table into something you operate rather
 * than read, so they stay off until asked for. These tests pin down both halves of that:
 * that the resting table is untouched, and that each feature works once switched on.
 */

const container = (page: import('@playwright/test').Page) => page.locator('#mock-basic');
const openMore = async (page: import('@playwright/test').Page) => container(page).getByRole('button', { name: 'More options' }).click();

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('既定で OFF の機能', () => {
  test('何も有効にしていない表には余分な列が出ない', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await expect(table.locator('thead tr').first().locator('th')).toHaveCount(3);
    await expect(table.locator('input[type="checkbox"]')).toHaveCount(0);
  });

  test('行選択を有効にするとチェックボックス列が出る', async ({ page }) => {
    await openMore(page);
    await container(page).getByRole('checkbox', { name: 'Select rows' }).check();
    await page.keyboard.press('Escape');

    const table = tableIn(page, 'mock-basic');
    await expect(table.locator('thead tr').first().locator('th')).toHaveCount(4);

    await table.getByRole('checkbox', { name: 'Select row 1' }).check();
    await expect(table.locator('tbody tr').first()).toHaveClass(/grt-row--selected/);
  });

  test('行選択を切るとチェックが残らない', async ({ page }) => {
    await openMore(page);
    await container(page).getByRole('checkbox', { name: 'Select rows' }).check();
    await page.keyboard.press('Escape');
    await tableIn(page, 'mock-basic').getByRole('checkbox', { name: 'Select row 1' }).check();

    await openMore(page);
    await container(page).getByRole('checkbox', { name: 'Select rows' }).uncheck();
    await page.keyboard.press('Escape');

    // A selection nobody can see is state the reader cannot undo.
    await expect(tableIn(page, 'mock-basic').locator('tbody tr.grt-row--selected')).toHaveCount(0);
  });

  test('行を固定すると先頭に留まる', async ({ page }) => {
    await openMore(page);
    await container(page).getByRole('checkbox', { name: 'Pin rows' }).check();
    await page.keyboard.press('Escape');

    const table = tableIn(page, 'mock-basic');
    // Row 5 is "Capybara", last in source order and first alphabetically.
    await table.getByRole('button', { name: 'Keep row 5 at the top' }).click();

    // Column 0 is now the controls column, so the names have shifted right by one.
    expect((await columnOf(table, 1))[0]).toBe('Capybara');

    // Sorting descending would otherwise put Capybara last; pinning outranks it.
    await table.locator('thead th', { hasText: 'Name' }).getByRole('button').click();
    await table.locator('thead th', { hasText: 'Name' }).getByRole('button').click();
    expect((await columnOf(table, 1))[0]).toBe('Capybara');
  });

  test('列でグループ化できる', async ({ page }) => {
    await openMore(page);
    await container(page).getByRole('combobox', { name: 'Group rows by column' }).selectOption({ label: 'Type' });
    await page.keyboard.press('Escape');

    const table = tableIn(page, 'mock-basic');

    // Two categories, and all five original rows still reachable underneath them.
    await expect(table.locator('tbody tr.grt-row--group')).toHaveCount(2);
    await expect(table.locator('tbody tr')).toHaveCount(7);
    // Groups follow the order the values first appear in, so the table still reads in
    // roughly the order the author wrote it.
    await expect(table.locator('tbody tr.grt-row--group').first()).toContainText('herbivore');
  });

  test('グループを畳める', async ({ page }) => {
    await openMore(page);
    await container(page).getByRole('combobox', { name: 'Group rows by column' }).selectOption({ label: 'Type' });
    await page.keyboard.press('Escape');

    const table = tableIn(page, 'mock-basic');
    await table.locator('tbody tr.grt-row--group').first().getByRole('button').click();

    // The herbivore group holds three rows; collapsing it leaves 7 - 3 = 4.
    await expect(table.locator('tbody tr')).toHaveCount(4);
  });

  test('グループ化を解くと元の表に戻る', async ({ page }) => {
    await openMore(page);
    const select = container(page).getByRole('combobox', { name: 'Group rows by column' });
    await select.selectOption({ label: 'Type' });
    await select.selectOption({ label: 'Nothing' });
    await page.keyboard.press('Escape');

    expect(await gridOf(tableIn(page, 'mock-basic'))).toHaveLength(5);
  });
});

test.describe('数値列', () => {
  test('数値だけの列は算術順に並ぶ', async ({ page }) => {
    /*
     * Column "Count" holds nothing but numbers, so it is handed to TanStack as numbers and
     * sorted arithmetically — 4 before 10, not "10" before "4". Mixed columns like "2.4m"
     * keep the natural sort instead (see the sorting spec).
     */
    const table = tableIn(page, 'mock-numeric');
    await table.locator('thead th', { hasText: 'Count' }).getByRole('button').click();

    expect(await columnOf(table, 1)).toEqual(['2', '4', '10', '30']);
  });

  test('グループ化すると数値列が合計される', async ({ page }) => {
    const local = page.locator('#mock-numeric');
    await local.getByRole('button', { name: 'More options' }).click();
    await local.getByRole('combobox', { name: 'Group rows by column' }).selectOption({ label: 'Team' });
    await page.keyboard.press('Escape');

    const table = tableIn(page, 'mock-numeric');
    const groups = table.locator('tbody tr.grt-row--group');

    await expect(groups).toHaveCount(2);
    // alpha: 10 + 30, beta: 2 + 4
    await expect(groups.filter({ hasText: 'alpha' }).locator('.grt-aggregated')).toHaveText('40');
    await expect(groups.filter({ hasText: 'beta' }).locator('.grt-aggregated')).toHaveText('6');
  });

  test('文字列の列には集約値を出さない', async ({ page }) => {
    const local = page.locator('#mock-basic');
    await local.getByRole('button', { name: 'More options' }).click();
    await local.getByRole('combobox', { name: 'Group rows by column' }).selectOption({ label: 'Type' });
    await page.keyboard.press('Escape');

    /*
     * A count of distinct names under a group header is a number the author never wrote.
     * The group header already says how many rows are in the group.
     */
    const firstGroup = tableIn(page, 'mock-basic').locator('tbody tr.grt-row--group').first();
    await expect(firstGroup).toHaveText('▾herbivore3');
  });
});
