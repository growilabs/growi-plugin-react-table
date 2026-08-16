import { expect, test } from '@playwright/test';
import { columnOf, tableIn } from '../helpers/table';

const container = (page: import('@playwright/test').Page) => page.locator('#mock-basic');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('全文検索', () => {
  test('検索欄は開くまで出てこない', async ({ page }) => {
    // The resting state of a table in an article should look like a table, not a form.
    await expect(container(page).getByRole('searchbox', { name: 'Search this table' })).toBeHidden();

    await container(page).getByRole('button', { name: 'Search' }).click();
    await expect(container(page).getByRole('searchbox', { name: 'Search this table' })).toBeVisible();
  });

  test('どの列に対しても効く', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await container(page).getByRole('button', { name: 'Search' }).click();

    const box = container(page).getByRole('searchbox', { name: 'Search this table' });

    await box.fill('carnivore');
    expect(await columnOf(table, 0)).toEqual(['Anaconda', 'Meerkat']);

    await box.fill('Zebra');
    expect(await columnOf(table, 0)).toEqual(['Zebra']);
  });

  test('閉じると検索条件も消える', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await container(page).getByRole('button', { name: 'Search' }).click();
    await container(page).getByRole('searchbox', { name: 'Search this table' }).fill('carnivore');
    expect(await columnOf(table, 0)).toHaveLength(2);

    /*
     * Leaving the query applied behind a collapsed box would leave the table silently
     * hiding rows with nothing on screen to explain it.
     */
    await container(page).getByRole('button', { name: 'Close search' }).click();
    expect(await columnOf(table, 0)).toHaveLength(5);
  });
});

test.describe('列フィルタ', () => {
  test('値の種類が少ない列はプルダウンになる', async ({ page }) => {
    await container(page).getByRole('button', { name: 'Column filters' }).click();

    // "Type" repeats two values across five rows — a category, so it gets a dropdown.
    const select = container(page).getByRole('combobox', { name: 'Filter by Type' });
    await expect(select).toBeVisible();
    await expect(select.locator('option')).toHaveText(['All', 'carnivore', 'herbivore']);

    // "Name" is distinct in every row — an identifier, so typing beats choosing.
    await expect(container(page).getByRole('searchbox', { name: 'Filter by Name' })).toBeVisible();
  });

  test('プルダウンで絞り込める', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await container(page).getByRole('button', { name: 'Column filters' }).click();

    await container(page).getByRole('combobox', { name: 'Filter by Type' }).selectOption('herbivore');
    expect(await columnOf(table, 0)).toEqual(['Zebra', 'Giraffe', 'Capybara']);
  });

  test('テキスト入力は部分一致で絞り込む', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await container(page).getByRole('button', { name: 'Column filters' }).click();

    await container(page).getByRole('searchbox', { name: 'Filter by Name' }).fill('ra');
    expect(await columnOf(table, 0)).toEqual(['Zebra', 'Giraffe', 'Capybara']);
  });

  test('閉じるとフィルタも消える', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await container(page).getByRole('button', { name: 'Column filters' }).click();
    await container(page).getByRole('combobox', { name: 'Filter by Type' }).selectOption('carnivore');
    expect(await columnOf(table, 0)).toHaveLength(2);

    await container(page).getByRole('button', { name: 'Close column filters' }).click();
    expect(await columnOf(table, 0)).toHaveLength(5);
  });
});

test.describe('件数表示', () => {
  test('行が隠れているときだけ出る', async ({ page }) => {
    const info = container(page).getByRole('status');

    // With every row visible the count only repeats what the reader can already see.
    await expect(info).toBeHidden();

    await container(page).getByRole('button', { name: 'Search' }).click();
    await container(page).getByRole('searchbox', { name: 'Search this table' }).fill('carnivore');

    await expect(info).toContainText('Showing 2 of 5 rows');
  });

  test('「show all」でフィルタだけが解除される', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');

    await container(page).getByRole('button', { name: 'Search' }).click();
    await container(page).getByRole('searchbox', { name: 'Search this table' }).fill('herbivore');

    // Sorting is a separate choice the reader made; clearing the filter must not undo it.
    await table.locator('thead th', { hasText: 'Name' }).getByRole('button').click();
    expect(await columnOf(table, 0)).toEqual(['Capybara', 'Giraffe', 'Zebra']);

    await container(page).getByRole('button', { name: 'show all' }).click();
    expect(await columnOf(table, 0)).toEqual(['Anaconda', 'Capybara', 'Giraffe', 'Meerkat', 'Zebra']);
  });
});
