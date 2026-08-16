/*
 * Probes that let Playwright inspect the React bridge from the page.
 *
 * The bridge (src/growi-react) re-exports React by hand, so a React upgrade can add an
 * export that nothing forwards. TypeScript cannot catch that — `import { x } from 'react'`
 * type-checks against the real @types/react either way — so the check is done at runtime
 * against the actual instance the host published.
 */
import * as bridge from '../growi-react';
import { hostReact } from './harness';

/**
 * Exports that are intentionally not forwarded as named bindings.
 *
 * They stay reachable through the bridge's default export (a Proxy), and nothing in the
 * redirected set — our sources, @tanstack/*, use-sync-external-store — imports them by name.
 */
const NOT_FORWARDED = new Set(['default', 'module.exports', 'act', 'unstable_act', 'createFactory']);

export type BridgeProbes = {
  /** React exports the bridge fails to provide. Must be empty. */
  missingExports: () => string[];
  /** Whether the bridge resolved to the very instance the host published. */
  usesHostReact: () => boolean;
};

declare global {
  interface Window {
    __growiReactBridge?: BridgeProbes;
  }
}

export const exposeBridgeProbes = (): void => {
  window.__growiReactBridge = {
    missingExports: () => Object.keys(hostReact).filter((key) => !NOT_FORWARDED.has(key) && !(key in bridge)),
    usesHostReact: () => bridge.getReact() === hostReact,
  };
};
