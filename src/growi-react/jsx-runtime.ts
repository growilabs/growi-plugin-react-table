/*
 * `react/jsx-runtime` on top of GROWI's React instance.
 *
 * `growiFacade.react` is the React namespace only — the automatic runtime's jsx() lives
 * in a separate entry point that the namespace does not expose. So it is rebuilt here
 * from `createElement`. See ./index.ts for why the lookup is deferred to call time.
 */
import type { Key, ReactElement } from 'react';
import { getReact } from './index';

export { Fragment } from './index';

type Props = Record<string, unknown> & { children?: unknown };

type CreateElement = (type: unknown, props: Props | null, ...children: unknown[]) => ReactElement;

const withKey = (props: Props, key: Key | undefined): Props => (key === undefined ? props : { ...props, key });

/**
 * Single (or no) child: `createElement(type, props)` carries it through `props.children`,
 * which also lets `createElement` pull `key` back out of props the way React 18 expects.
 */
export const jsx = (type: unknown, props: Props, key?: Key): ReactElement => (getReact().createElement as unknown as CreateElement)(type, withKey(props, key));

/**
 * Statically known children — `<svg><path/><path/></svg>`.
 *
 * These must be passed as separate arguments, not as `props.children`. React only
 * demands `key` on children it was handed as an array, so collapsing jsxs onto jsx
 * produces a spurious "Each child in a list should have a unique key" warning for markup
 * that has no list in it at all.
 */
export const jsxs = (type: unknown, props: Props, key?: Key): ReactElement => {
  const { children, ...rest } = props;
  const createElement = getReact().createElement as unknown as CreateElement;

  return Array.isArray(children) ? createElement(type, withKey(rest, key), ...children) : createElement(type, withKey(props, key));
};

/**
 * The development runtime folds both forms into one entry point and says which it is via
 * `isStaticChildren`, so it has to dispatch rather than alias one of them.
 */
export const jsxDEV = (type: unknown, props: Props, key?: Key, isStaticChildren?: boolean): ReactElement =>
  isStaticChildren === true ? jsxs(type, props, key) : jsx(type, props, key);
