/*
 * A stand-in for the `react` module that forwards to GROWI's own React instance.
 *
 * Why this exists
 * -------------------------------------------------------------------------------------------------------
 * A GROWI plugin is rendered by GROWI's reconciler. React stores the active hook
 * dispatcher inside the React *module instance* that the renderer belongs to, so a
 * plugin that bundles its own copy of React reads a dispatcher that is always null:
 * every hook throws "Invalid hook call". growi-plugin-datatables hit exactly this and
 * worked around it by avoiding hooks altogether (see its DataTable.tsx `[MEMO]`).
 *
 * We need hooks — @tanstack/react-table v9 is `useTable()` — so instead of bundling
 * React we borrow GROWI's. `GrowiPluginsActivator` publishes it:
 *
 *     registerGrowiFacade({ markdownRenderer: {...}, react: React })
 *
 * vite/growi-react-resolver.ts rewrites every `react` import in the plugin bundle
 * (ours, @tanstack/*, use-sync-external-store) to this module.
 *
 * Why the indirection has to be lazy
 * -------------------------------------------------------------------------------------------------------
 * GROWI emits the plugin as `<script type="module">` in <head>, so this module is
 * evaluated *before* `registerGrowiFacade()` ever runs. `growiFacade.react` does not
 * exist yet at that point. Every export below therefore resolves on first use, not on
 * import.
 */

import type * as React from 'react';

type ReactModule = typeof React;

declare global {
  var growiFacade: { react?: ReactModule } | undefined;
}

let resolved: ReactModule | null = null;

/**
 * Whether GROWI has published its React instance yet.
 *
 * `client-entry.tsx` checks this before wrapping `components.table`: on a GROWI old
 * enough to lack `growiFacade.react` we leave tables alone rather than crash the page.
 */
export const isGrowiReactAvailable = (): boolean => globalThis.growiFacade?.react != null;

/**
 * GROWI's React instance. Memoized after the first successful lookup.
 */
export const getReact = (): ReactModule => {
  if (resolved != null) {
    return resolved;
  }

  const react = globalThis.growiFacade?.react;
  if (react == null) {
    throw new Error(
      'growi-plugin-react-table: growiFacade.react is not available. ' + 'The plugin must not be used before GROWI has registered its React instance.',
    );
  }

  resolved = react;
  bindLateValues(react);
  return react;
};

/*
 * Non-callable exports
 * -------------------------------------------------------------------------------------------------------
 * These cannot be wrapped in a forwarding function, so they are exported as live
 * bindings that get filled in the first time getReact() succeeds. Reading them before
 * that yields undefined — which is fine, because nothing in the redirected set
 * (our sources, @tanstack/*, use-sync-external-store) touches them at module scope.
 */
let lateChildren: ReactModule['Children'] | undefined;
let lateComponent: ReactModule['Component'] | undefined;
let latePureComponent: ReactModule['PureComponent'] | undefined;
let lateVersion: string | undefined;
let lateInternals: unknown;

const bindLateValues = (react: ReactModule): void => {
  lateChildren = react.Children;
  lateComponent = react.Component;
  latePureComponent = react.PureComponent;
  lateVersion = react.version;
  lateInternals = (react as unknown as Record<string, unknown>).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
};

export {
  lateChildren as Children,
  lateComponent as Component,
  lateInternals as __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  latePureComponent as PureComponent,
  lateVersion as version,
};

/*
 * Element-type sentinels
 * -------------------------------------------------------------------------------------------------------
 * These are `Symbol.for(...)` values, so they are identical across React copies and
 * across React 18/19. Defining them here rather than forwarding keeps `<>...</>` usable
 * in modules that are evaluated before the facade exists.
 */
export const Fragment = Symbol.for('react.fragment') as unknown as ReactModule['Fragment'];
export const StrictMode = Symbol.for('react.strict_mode') as unknown as ReactModule['StrictMode'];
export const Suspense = Symbol.for('react.suspense') as unknown as ReactModule['Suspense'];
export const Profiler = Symbol.for('react.profiler') as unknown as ReactModule['Profiler'];

/*
 * Forwarded functions
 * -------------------------------------------------------------------------------------------------------
 */
const forward =
  <K extends keyof ReactModule>(name: K) =>
  (...args: unknown[]): unknown =>
    (getReact()[name] as unknown as (...a: unknown[]) => unknown)(...args);

export const createElement = forward('createElement') as ReactModule['createElement'];
export const cloneElement = forward('cloneElement') as ReactModule['cloneElement'];
export const createContext = forward('createContext') as ReactModule['createContext'];
export const createRef = forward('createRef') as ReactModule['createRef'];
export const forwardRef = forward('forwardRef') as ReactModule['forwardRef'];
export const isValidElement = forward('isValidElement') as ReactModule['isValidElement'];
export const lazy = forward('lazy') as ReactModule['lazy'];
export const memo = forward('memo') as ReactModule['memo'];
export const startTransition = forward('startTransition') as ReactModule['startTransition'];

export const useCallback = forward('useCallback') as ReactModule['useCallback'];
export const useContext = forward('useContext') as ReactModule['useContext'];
export const useDebugValue = forward('useDebugValue') as ReactModule['useDebugValue'];
export const useDeferredValue = forward('useDeferredValue') as ReactModule['useDeferredValue'];
export const useEffect = forward('useEffect') as ReactModule['useEffect'];
export const useId = forward('useId') as ReactModule['useId'];
export const useImperativeHandle = forward('useImperativeHandle') as ReactModule['useImperativeHandle'];
export const useInsertionEffect = forward('useInsertionEffect') as ReactModule['useInsertionEffect'];
export const useLayoutEffect = forward('useLayoutEffect') as ReactModule['useLayoutEffect'];
export const useMemo = forward('useMemo') as ReactModule['useMemo'];
export const useReducer = forward('useReducer') as ReactModule['useReducer'];
export const useRef = forward('useRef') as ReactModule['useRef'];
export const useState = forward('useState') as ReactModule['useState'];
export const useSyncExternalStore = forward('useSyncExternalStore') as ReactModule['useSyncExternalStore'];
export const useTransition = forward('useTransition') as ReactModule['useTransition'];

/*
 * Default export
 * -------------------------------------------------------------------------------------------------------
 * `import React from 'react'; React.something` is resolved dynamically, so this covers
 * everything — including exports not listed above.
 */
export default new Proxy({} as ReactModule, {
  get: (_target, prop) => (getReact() as unknown as Record<string | symbol, unknown>)[prop],
  has: (_target, prop) => prop in (getReact() as object),
  ownKeys: () => Reflect.ownKeys(getReact() as object),
  getOwnPropertyDescriptor: (_target, prop) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(getReact() as object, prop);
    return descriptor == null ? undefined : { ...descriptor, configurable: true };
  },
});
