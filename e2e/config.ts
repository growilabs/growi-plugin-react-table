import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where GROWI is reachable.
 *
 * `http://localhost:3000` is the published port, used from CI and from the host.
 * From inside the devcontainer the stack is a sibling service, so point this at
 * `http://growi:3000` instead:
 *
 *   E2E_BASE_URL=http://growi:3000 pnpm e2e
 *
 * Both pass GROWI's origin check: CertifyOrigin compares against APP_SITE_URL *or* the
 * runtime origin of the request.
 */
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/** Must match AUTO_INSTALL_ADMIN_* in e2e/docker-compose.yaml. */
export const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'e2e-admin-password';

/** Session saved by global-setup and reused by the specs that need to be logged in. */
export const STORAGE_STATE = path.join(here, '.auth/admin.json');

/** installedPath of the plugin inside GROWI. Also the prefix of its static assets. */
export const PLUGIN_INSTALLED_PATH = 'growilabs/growi-plugin-react-table';
