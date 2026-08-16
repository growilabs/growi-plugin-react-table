import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { type APIRequestContext, request } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USERNAME, BASE_URL, STORAGE_STATE } from './config.ts';
import { ALL_FIXTURES, type Fixture } from './pages.ts';

const HEALTHCHECK_TIMEOUT_MS = 240_000;
const HEALTHCHECK_INTERVAL_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits until GROWI answers and has finished the AUTO_INSTALL bootstrap.
 *
 * `connectToMiddlewares=true` makes the endpoint check MongoDB too, so a 200 means the
 * app is genuinely usable rather than merely listening.
 */
const waitForGrowi = async (api: APIRequestContext): Promise<void> => {
  const deadline = Date.now() + HEALTHCHECK_TIMEOUT_MS;
  let lastError = 'no attempt made';

  while (Date.now() < deadline) {
    try {
      const response = await api.get('/_api/v3/healthcheck?connectToMiddlewares=true');
      if (response.ok()) {
        return;
      }
      lastError = `HTTP ${response.status()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(HEALTHCHECK_INTERVAL_MS);
  }

  throw new Error(`GROWI did not become healthy at ${BASE_URL} within ${HEALTHCHECK_TIMEOUT_MS}ms (last: ${lastError})`);
};

/*
 * No CSRF token is needed: GROWI configures csurf with
 * `ignoreMethods: ['GET','HEAD','OPTIONS','PUT','POST','DELETE']`, which disables it.
 * The `/_api` origin check passes because an APIRequestContext sends no Origin header,
 * and CertifyOrigin treats a missing Origin as same-origin.
 */
const login = async (api: APIRequestContext): Promise<void> => {
  const response = await api.post('/_api/v3/login', {
    data: { loginForm: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } },
  });

  if (!response.ok()) {
    throw new Error(`login failed: HTTP ${response.status()} ${await response.text()}`);
  }
};

/** Creates the page, or rewrites its body if a previous run already made it. */
const upsertPage = async (api: APIRequestContext, fixture: Fixture): Promise<void> => {
  const existing = await api.get('/_api/v3/page', { params: { path: fixture.path } });

  if (existing.ok()) {
    const { page } = (await existing.json()) as { page?: { _id: string; revision?: string | { _id: string } } };
    if (page != null) {
      const revision = page.revision;
      const response = await api.put('/_api/v3/page', {
        data: {
          pageId: page._id,
          revisionId: typeof revision === 'string' ? revision : revision?._id,
          body: fixture.body,
        },
      });
      if (!response.ok()) {
        throw new Error(`failed to update ${fixture.path}: HTTP ${response.status()} ${await response.text()}`);
      }
      return;
    }
  }

  const response = await api.post('/_api/v3/page', {
    data: { path: fixture.path, body: fixture.body },
  });
  if (!response.ok()) {
    throw new Error(`failed to create ${fixture.path}: HTTP ${response.status()} ${await response.text()}`);
  }
};

const globalSetup = async (): Promise<void> => {
  const api = await request.newContext({ baseURL: BASE_URL });

  await waitForGrowi(api);
  await login(api);

  for (const fixture of ALL_FIXTURES) {
    await upsertPage(api, fixture);
  }

  await mkdir(path.dirname(STORAGE_STATE), { recursive: true });
  await api.storageState({ path: STORAGE_STATE });
  await api.dispose();
};

export default globalSetup;
