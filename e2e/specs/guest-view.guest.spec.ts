import { BASIC_TABLE_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

/*
 * Runs without the saved admin session (see the `guest` project in
 * playwright.e2e.config.ts), so it exercises the path where GROWI decides not to render
 * the "edit this table" button at all — a different subtree from the admin case.
 */
test.describe('ゲスト閲覧', () => {
  test('未ログインでも表が動く', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);

    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();
    await expect(page.locator('.handsontable-modal-trigger')).toHaveCount(0);

    const nameHeader = page.locator('thead th', { hasText: 'Name' });
    await nameHeader.getByRole('button').click();
    await expect(page.locator('table tbody tr td:first-child').first()).toHaveText('Anaconda');

    expectNoReactFailures(consoleErrors);
  });
});
