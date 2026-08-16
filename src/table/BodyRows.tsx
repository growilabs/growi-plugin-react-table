import { type CSSProperties, cloneElement } from 'react';
import type { ParsedTable } from './parseTable';
import { columnIndexOf } from './parseTable';
import { pinnedStyleFor } from './pinning';
import type { PluginTable } from './tableTypes';

type Row = ReturnType<PluginTable['getRowModel']>['rows'][number];

type Props = {
  table: PluginTable;
  parsed: ParsedTable;
  /** Whether the leading column of per-row controls is shown at all. */
  showControls: boolean;
  selectable: boolean;
  pinnable: boolean;
};

/**
 * A leading cell holding the per-row controls.
 *
 * One column for both selection and row pinning, rather than one each: every control
 * column is a column of the reader's screen that is not the author's table.
 */
const ControlCell = ({ row, selectable, pinnable }: { row: Row; selectable: boolean; pinnable: boolean }) => {
  const pinned = row.getIsPinned();

  return (
    <td className="grt-controls">
      {selectable && row.getCanSelect() && (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label={`Select row ${row.index + 1}`} />
      )}
      {pinnable && (
        <button
          type="button"
          className={`grt-menu__action${pinned === 'top' ? ' grt-menu__action--on' : ''}`}
          onClick={() => row.pin(pinned === 'top' ? false : 'top')}
          aria-pressed={pinned === 'top'}
          aria-label={`Keep row ${row.index + 1} at the top`}
          title={`Keep row ${row.index + 1} at the top`}
        >
          ⇧
        </button>
      )}
    </td>
  );
};

const cellStyle = (base: CSSProperties | undefined, pinned: CSSProperties | undefined): CSSProperties | undefined =>
  pinned == null ? base : { ...base, ...pinned };

/**
 * Renders the body, mapping TanStack's row model back onto GROWI's original cells.
 *
 * A leaf cell is the very `<td>` GROWI rendered, re-keyed and moved. Grouping introduces
 * cells that have no original — a group header, an aggregate, a placeholder — and those
 * are drawn from the row model instead.
 */
export const BodyRows = ({ table, parsed, showControls, selectable, pinnable }: Props) => {
  const renderRow = (row: Row) => (
    <tr key={row.id} className={[row.getIsGrouped() ? 'grt-row--group' : null, row.getIsSelected() ? 'grt-row--selected' : null].filter(Boolean).join(' ')}>
      {showControls && <ControlCell row={row} selectable={selectable} pinnable={pinnable} />}
      {row.getVisibleCells().map((cell) => {
        const pinnedStyle = pinnedStyleFor(cell.column);
        const pinnedClassName = pinnedStyle == null ? undefined : 'grt-td--pinned';

        /*
         * A grouped row is synthetic — TanStack points its `original` at the first leaf,
         * so falling through to the leaf branch would silently repeat that row's cells
         * next to the group header. Branch on the row, not on whether an aggregation
         * function happens to be configured.
         */
        if (row.getIsGrouped()) {
          if (cell.getIsGrouped()) {
            return (
              <td key={cell.id} className={pinnedClassName} style={pinnedStyle}>
                <button type="button" className="grt-group-toggle" onClick={row.getToggleExpandedHandler()} aria-expanded={row.getIsExpanded()}>
                  <span aria-hidden="true">{row.getIsExpanded() ? '▾' : '▸'}</span>
                  {String(cell.getValue() ?? '')}
                  <span className="grt-group-count">{row.subRows.length}</span>
                </button>
              </td>
            );
          }

          // Numbers only. A summary of text would read as data the author never wrote,
          // and the group header already says how many rows are underneath.
          const aggregate = cell.getIsAggregated() ? cell.getValue() : undefined;
          return (
            <td key={cell.id} className={[pinnedClassName, 'grt-aggregated'].filter(Boolean).join(' ')} style={pinnedStyle}>
              {typeof aggregate === 'number' ? String(aggregate) : ''}
            </td>
          );
        }

        // The grouping column repeated on a leaf row: the value is already in the header.
        if (cell.getIsPlaceholder()) {
          return <td key={cell.id} className={pinnedClassName} style={pinnedStyle} />;
        }

        const source = parsed.rows[row.original?.__index ?? -1]?.cells[columnIndexOf(cell.column.id)];
        if (source == null) {
          return <td key={cell.id} className={pinnedClassName} style={pinnedStyle} />;
        }

        /*
         * Re-key the original `<td>` so React tracks it by cell rather than by position:
         * a re-sorted row must move its DOM node, not swap its contents.
         */
        const sourceProps = source.props as { style?: CSSProperties; className?: string };
        return cloneElement(source, {
          key: cell.id,
          ...(pinnedStyle == null
            ? {}
            : {
                style: cellStyle(sourceProps.style, pinnedStyle),
                className: [sourceProps.className, pinnedClassName].filter(Boolean).join(' '),
              }),
        });
      })}
    </tr>
  );

  const pinnedRows = table.getTopRows();

  return (
    <>
      {/* Pinned rows first, so they stay visible no matter how the rest is ordered. */}
      {pinnedRows.map(renderRow)}
      {(pinnedRows.length > 0 ? table.getCenterRows() : table.getRowModel().rows).map(renderRow)}
    </>
  );
};
