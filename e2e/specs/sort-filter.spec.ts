import { BASIC_TABLE_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

const namesIn = async (page: import('@playwright/test').Page): Promise<string[]> =>
  page
    .locator('table tbody tr td:first-child')
    .allInnerTexts()
    .then((texts) => texts.map((text) => text.trim()));

/*
 * The features work on a real page, against markdown GROWI parsed itself.
 *
 * The mock suite covers the behaviour in depth; what this adds is that GROWI's own
 * pipeline produces a table the plugin can read — its remark/rehype plugins, its sanitizer
 * and its component overrides all run before the plugin ever sees a cell.
 */
test.describe('実ページ上のソートとフィルタ', () => {
  test('ヘッダのクリックで並べ替えられる', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();

    expect(await namesIn(page)).toEqual(['Zebra', 'Anaconda', 'Meerkat', 'Giraffe', 'Capybara']);

    const nameHeader = page.locator('thead th', { hasText: 'Name' });
    await nameHeader.getByRole('button').click();
    expect(await namesIn(page)).toEqual(['Anaconda', 'Capybara', 'Giraffe', 'Meerkat', 'Zebra']);

    await nameHeader.getByRole('button').click();
    await nameHeader.getByRole('button').click();
    expect(await namesIn(page)).toEqual(['Zebra', 'Anaconda', 'Meerkat', 'Giraffe', 'Capybara']);

    expectNoReactFailures(consoleErrors);
  });

  test('検索で行を絞り込める', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();

    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('searchbox', { name: 'Search this table' }).fill('carnivore');

    expect(await namesIn(page)).toEqual(['Anaconda', 'Meerkat']);
    await expect(page.getByRole('status')).toContainText('Showing 2 of 5 rows');

    expectNoReactFailures(consoleErrors);
  });

  test('小さい表はそのまま', async ({ page }) => {
    await page.goto('/e2e/tiny-table');
    await expect(page.getByRole('table')).toBeVisible();

    // A reader should not be able to tell the plugin is installed on a page like this.
    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toHaveCount(0);
  });
});
