import { expect, test } from '@playwright/test';
import { columnOf, gridOf, sortButton, tableIn } from '../helpers/table';

const SOURCE_ORDER = ['Zebra', 'Anaconda', 'Meerkat', 'Giraffe', 'Capybara'];

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('ソート', () => {
  test('既定では markdown に書いた順序のまま', async ({ page }) => {
    // "Keep the original order by default" is a requirement, not a side effect:
    // a reader following prose that refers to "the third row" must still find it there.
    expect(await columnOf(tableIn(page, 'mock-basic'), 0)).toEqual(SOURCE_ORDER);
  });

  test('昇順 → 降順 → 元の順序 と巡回する', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    const button = sortButton(table, 'Name');

    await button.click();
    expect(await columnOf(table, 0)).toEqual(['Anaconda', 'Capybara', 'Giraffe', 'Meerkat', 'Zebra']);

    await button.click();
    expect(await columnOf(table, 0)).toEqual(['Zebra', 'Meerkat', 'Giraffe', 'Capybara', 'Anaconda']);

    // The third click clears the sort rather than going back to ascending, so there is
    // always a way back to the order the page author wrote.
    await button.click();
    expect(await columnOf(table, 0)).toEqual(SOURCE_ORDER);
  });

  test('ソート状態が aria-sort に出る', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    const header = table.locator('thead th', { hasText: 'Name' });

    await expect(header).toHaveAttribute('aria-sort', 'none');
    await sortButton(table, 'Name').click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await sortButton(table, 'Name').click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  test('数値混じりの文字列が自然順に並ぶ', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await sortButton(table, 'Length').click();

    /*
     * Lexicographic order would put "10.9m" between "0.35m" and "1.3m". The
     * `alphanumeric` sort function compares digit runs numerically, which is the
     * behaviour growi-plugin-datatables got from its "natural" sorting plugin.
     */
    expect(await columnOf(table, 2)).toEqual(['0.35m', '1.3m', '2.4m', '4.5m', '10.9m']);
  });

  test('ソート解除ボタンはソート中だけ現れる', async ({ page }) => {
    const container = page.locator('#mock-basic');
    const reset = container.getByRole('button', { name: 'Reset sorting' });

    await expect(reset).toBeHidden();

    await sortButton(tableIn(page, 'mock-basic'), 'Name').click();
    await expect(reset).toBeVisible();

    await reset.click();
    expect(await columnOf(tableIn(page, 'mock-basic'), 0)).toEqual(SOURCE_ORDER);
    await expect(reset).toBeHidden();
  });

  test('行はまとまって動く（セルがばらけない）', async ({ page }) => {
    const table = tableIn(page, 'mock-basic');
    await sortButton(table, 'Name').click();

    // Sorting rearranges rows; a cell must never end up next to a different row's data.
    expect(await gridOf(table)).toEqual([
      ['Anaconda', 'carnivore', '10.9m'],
      ['Capybara', 'herbivore', '1.3m'],
      ['Giraffe', 'herbivore', '4.5m'],
      ['Meerkat', 'carnivore', '0.35m'],
      ['Zebra', 'herbivore', '2.4m'],
    ]);
  });

  test('セル内のマークアップがソート後も生きている', async ({ page }) => {
    const table = tableIn(page, 'mock-rich-cell');
    await sortButton(table, 'Page').click();

    /*
     * Rows are reordered by moving GROWI's own cell elements, not by re-rendering text
     * from the sort keys — so links, code spans and emphasis have to come through intact.
     */
    expect(await columnOf(table, 0)).toEqual(['alpha', 'beta', 'gamma']);
    await expect(table.getByRole('link', { name: 'alpha' })).toHaveAttribute('href', '/alpha');
    await expect(table.locator('code')).toHaveText('npm run beta');
    await expect(table.locator('strong')).toHaveText('ready');
  });
});

test.describe('拡張しない表', () => {
  test('本文が1行しかない表には手を出さない', async ({ page }) => {
    await expect(page.locator('#mock-tiny [data-growi-plugin-react-table="active"]')).toHaveCount(0);
    await expect(page.locator('#mock-tiny thead th button')).toHaveCount(0);
    // Still a perfectly good table, just not an enhanced one.
    await expect(page.locator('#mock-tiny table tbody tr')).toHaveCount(1);
  });

  test('ヘッダ行が無い表には手を出さない', async ({ page }) => {
    await expect(page.locator('#mock-headerless [data-growi-plugin-react-table="active"]')).toHaveCount(0);
    await expect(page.locator('#mock-headerless table tbody tr')).toHaveCount(3);
  });
});
