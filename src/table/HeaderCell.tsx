import { type CSSProperties, cloneElement, type ReactElement, type ReactNode } from 'react';
import { SortAscIcon, SortDescIcon, SortNoneIcon } from '../toolbar/icons';
import type { PluginTable } from './tableTypes';

type Header = ReturnType<PluginTable['getHeaderGroups']>[number]['headers'][number];

type Props = {
  /** The original `<th>` from GROWI's renderer. Cloned so its alignment styles survive. */
  original: ReactElement;
  header: Header;
  label: string;
  /** Set only for columns the reader has resized, so untouched tables stay auto-laid-out. */
  width: number | undefined;
  pinnedStyle: CSSProperties | undefined;
};

const SORT_ACTION: Record<string, string> = {
  none: 'Sort ascending',
  asc: 'Sort descending',
  desc: 'Clear sorting',
};

const sortIcon = (direction: 'asc' | 'desc' | false) => {
  if (direction === 'asc') {
    return <SortAscIcon className="grt-sort-icon grt-sort-icon--active" />;
  }
  if (direction === 'desc') {
    return <SortDescIcon className="grt-sort-icon grt-sort-icon--active" />;
  }
  return <SortNoneIcon className="grt-sort-icon" />;
};

/**
 * A header cell with sorting, and a resize grip when resizing is available.
 *
 * The `<th>` is GROWI's own element, cloned rather than rebuilt: GFM puts the column
 * alignment on it as an inline style, which re-creating the cell would drop.
 *
 * The click target is a button inside the cell, not the cell itself. A clickable `<th>`
 * means selecting the header text re-sorts the table, and leaves keyboard users no way in.
 */
export const HeaderCell = ({ original, header, label, width, pinnedStyle }: Props) => {
  const { children, className, style, ...rest } = original.props as {
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
  };

  const column = header.column;
  const sorted = column.getIsSorted();
  const ariaSort = sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none';
  const canSort = column.getCanSort();
  const canResize = column.getCanResize();

  const mergedStyle: CSSProperties | undefined =
    width == null && pinnedStyle == null && style == null ? undefined : { ...style, ...pinnedStyle, ...(width == null ? {} : { width }) };

  return cloneElement(original, {
    ...rest,
    className: [className, 'grt-th', pinnedStyle == null ? null : 'grt-th--pinned'].filter(Boolean).join(' '),
    style: mergedStyle,
    'aria-sort': canSort ? ariaSort : undefined,
    children: (
      <>
        {canSort ? (
          <button
            type="button"
            className="grt-sort-button"
            onClick={column.getToggleSortingHandler()}
            // The header text is the visible label; this says what a click will do.
            title={`${label}: ${SORT_ACTION[sorted === false ? 'none' : sorted]}`}
          >
            <span className="grt-th__label">{children}</span>
            {sortIcon(sorted)}
          </button>
        ) : (
          children
        )}
        {canResize && (
          /*
           * A grip rather than a whole-edge hit area: the edge of a header cell is also
           * where people drag to select text.
           *
           * Not focusable — resizing is a refinement, and every column stays readable at
           * its natural width, so there is nothing here a keyboard user is locked out of.
           */
          <span
            className={`grt-resizer${column.getIsResizing() ? ' grt-resizer--active' : ''}`}
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            role="presentation"
            aria-hidden="true"
          />
        )}
      </>
    ),
  });
};
