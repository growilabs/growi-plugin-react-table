import { PLUGIN_INSTALLED_PATH } from '../config.ts';
import { BASIC_TABLE_PAGE } from '../pages.ts';
import { expect, test } from '../test.ts';

/*
 * The delivery path, end to end: the bind-mounted dist, the `growiplugins` document,
 * the manifest lookup in retrieveAllPluginResourceEntries(), and the tags emitted by
 * _document.page.tsx. If any link breaks the plugin is simply absent, and every other
 * spec would fail with a confusing "toolbar not found".
 */
test.describe('プラグインの読み込み', () => {
  test('GROWI がプラグインの script を <head> に出す', async ({ page }) => {
    await page.goto(BASIC_TABLE_PAGE.path);

    const scriptSrc = await page.locator(`head script[type="module"][src*="/static/plugins/${PLUGIN_INSTALLED_PATH}/"]`).first().getAttribute('src');

    expect(scriptSrc, 'the plugin script tag is missing — check seed-plugin.sh and the dist bind mount').not.toBeNull();
    expect(scriptSrc).toMatch(/\.js$/);
  });

  test('配信されている script が実体を返す', async ({ page, request }) => {
    await page.goto(BASIC_TABLE_PAGE.path);

    const scriptSrc = await page.locator(`head script[type="module"][src*="/static/plugins/${PLUGIN_INSTALLED_PATH}/"]`).first().getAttribute('src');

    const response = await request.get(scriptSrc!);
    expect(response.status()).toBe(200);

    /*
     * The bundle must not carry React. If it did, the redirect in
     * vite/growi-react-resolver.ts stopped covering something and every hook would
     * throw once GROWI rendered the wrapper.
     */
    expect(await response.text()).not.toContain('Minified React error');
  });

  test('スタイルシートが 200 で返る', async ({ page, request }) => {
    await page.goto(BASIC_TABLE_PAGE.path);

    const href = await page.locator(`head link[rel="stylesheet"][href*="/static/plugins/${PLUGIN_INSTALLED_PATH}/"]`).first().getAttribute('href');

    /*
     * GROWI builds this href by interpolating manifest[...].css, which is an array.
     * A second CSS chunk would yield "a.css,b.css" and 404 — so this asserts the
     * single-chunk build, not just that the file exists.
     */
    expect(href, 'no plugin stylesheet was emitted').not.toBeNull();
    expect(href).not.toContain(',');
    expect((await request.get(href!)).status()).toBe(200);
  });
});
