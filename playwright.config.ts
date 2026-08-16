import { defineConfig, devices } from '@playwright/test';

/**
 * Tests against the mock pages served by the vite dev server.
 *
 * The GROWI integration tests live in a separate project; see playwright.e2e.config.ts.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Performance measurements must not compete with other workers for the main thread.
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
