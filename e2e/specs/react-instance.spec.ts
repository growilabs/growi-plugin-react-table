import { BASIC_TABLE_PAGE, RICH_CELL_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

/*
 * The gate for the whole design.
 *
 * The plugin ships no React and calls hooks inside a component that GROWI's reconciler
 * renders. That only works because src/growi-react forwards to `growiFacade.react`.
 * Mock pages can show the wiring is plausible; only a real GROWI shows it is true.
 */
test.describe('GROWI の React インスタンス', () => {
  test('実機のレンダラ配下でラッパーが描画される', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);

    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    expectNoReactFailures(consoleErrors);
  });

  test('表の前後の本文が消えていない', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);

    /*
     * A throw inside the table component unwinds its subtree, and an uncaught throw from
     * a rehype plugin takes the whole article with it — GROWI renders the entire page
     * body through one ReactMarkdown. Checking the surrounding prose catches both.
     */
    await expect(page.getByText('Text after the table.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Basic table' })).toBeVisible();

    expectNoReactFailures(consoleErrors);
  });

  test('GROWI が描いたセル内のリンクが生きている', async ({ page, consoleErrors }) => {
    await page.goto(RICH_CELL_PAGE.path);

    /*
     * Cell contents are GROWI's own React elements, produced by its renderer and its
     * component overrides. The plugin reuses those elements rather than re-creating
     * cells from text, so they must survive intact.
     */
    await expect(page.getByRole('link', { name: 'alpha' })).toHaveAttribute('href', '/alpha');
    await expect(page.locator('table code', { hasText: 'npm run beta' })).toBeVisible();

    expectNoReactFailures(consoleErrors);
  });
});
