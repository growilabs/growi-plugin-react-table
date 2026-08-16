import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

const BRIDGE = path.join(projectRoot, 'src/growi-react/index.ts');
const BRIDGE_JSX_RUNTIME = path.join(projectRoot, 'src/growi-react/jsx-runtime.ts');

const REDIRECTS: Record<string, string> = {
  react: BRIDGE,
  'react/jsx-runtime': BRIDGE_JSX_RUNTIME,
  'react/jsx-dev-runtime': BRIDGE_JSX_RUNTIME,
};

/*
 * Third-party packages whose `react` imports must also go through the bridge.
 *
 * Matched as a substring of the importer's resolved path, not as a prefix:
 * under pnpm an importer looks like
 *   <root>/node_modules/.pnpm/@tanstack+table-core@9.1.2/node_modules/@tanstack/table-core/dist/index.js
 * so anchoring at the project root would miss everything. The substring form
 * matches both the pnpm and the npm/yarn layouts.
 */
const REDIRECTED_PACKAGES = [
  '/node_modules/@tanstack/',
  // @tanstack/react-store pulls this in; it reads useSyncExternalStore off React.
  '/node_modules/use-sync-external-store/',
];

/*
 * Our own sources that must NOT be redirected.
 *
 * The mock and bench pages play the part of GROWI: they hold the real React
 * instance and publish it on `growiFacade.react`. If their own imports were
 * redirected too, the bridge would be asked to resolve itself.
 */
const PASSTHROUGH_DIRS = [path.join(projectRoot, 'src/mock'), path.join(projectRoot, 'src/bench')];

const isOwnSource = (importer: string): boolean =>
  importer === path.join(projectRoot, 'client-entry.tsx') || importer.startsWith(path.join(projectRoot, 'src'));

const normalize = (p: string): string => p.split(path.sep).join('/');

/**
 * Points `react` at the bridge (src/growi-react) for everything that ends up in
 * the plugin bundle, so the built plugin contains no React of its own and uses
 * `growiFacade.react` — GROWI's instance — at runtime instead.
 *
 * Shipping a second React copy would make every hook throw, because GROWI's
 * reconciler sets the dispatcher on *its* React, not on ours.
 */
export const growiReactResolver = (): Plugin => ({
  name: 'growi-react-resolver',
  enforce: 'pre',

  resolveId(source, importer) {
    const target = REDIRECTS[source];
    if (target == null || importer == null) {
      return null;
    }

    // The bridge itself has no `react` import, but guard anyway so a future
    // edit cannot create a self-referencing module.
    if (importer === BRIDGE || importer === BRIDGE_JSX_RUNTIME) {
      return null;
    }

    const importerPath = normalize(importer);

    if (PASSTHROUGH_DIRS.some((dir) => importerPath.startsWith(normalize(dir)))) {
      return null;
    }

    if (isOwnSource(importer) || REDIRECTED_PACKAGES.some((pkg) => importerPath.includes(pkg))) {
      return target;
    }

    return null;
  },
});
