import { pinColumn } from '../table/pinning';
import type { PluginTable } from '../table/tableTypes';
import { Dropdown } from './Dropdown';
import { ColumnsIcon } from './icons';

type Props = {
  table: PluginTable;
  /** Header labels by column id. Column ids are positional, so they read as "c0". */
  labels: Map<string, string>;
};

/** The order actually in effect. TanStack leaves the state empty until something moves. */
const currentOrder = (table: PluginTable): string[] => {
  const order = table.state.columnOrder ?? [];
  return order.length > 0 ? [...order] : table.getAllLeafColumns().map((column) => column.id);
};

const move = (table: PluginTable, id: string, offset: number): void => {
  const order = currentOrder(table);
  const from = order.indexOf(id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= order.length) {
    return;
  }
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved as string);
  table.setColumnOrder(order);
};

/**
 * Per-column controls: show/hide, reorder, and pin.
 *
 * Reordering is buttons rather than drag-and-drop. Dragging a column header inside a
 * page of prose competes with selecting text and with the browser's own drag behaviour,
 * and it gives keyboard users nothing.
 */
export const ColumnsMenu = ({ table, labels }: Props) => {
  const order = currentOrder(table);

  return (
    <Dropdown label="Columns" icon={<ColumnsIcon />}>
      {() => (
        <>
          <ul className="grt-menu">
            {order.map((id, index) => {
              const column = table.getColumn(id);
              if (column == null) {
                return null;
              }

              const label = labels.get(id) ?? id;
              const pinned = column.getIsPinned();

              return (
                <li key={id} className="grt-menu__item">
                  <label className="grt-menu__toggle">
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      // The last visible column cannot be hidden: an empty table is not a view.
                      disabled={column.getIsVisible() && table.getVisibleLeafColumns().length === 1}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    <span className="grt-menu__label">{label}</span>
                  </label>

                  <span className="grt-menu__actions">
                    <button
                      type="button"
                      className="grt-menu__action"
                      disabled={index === 0}
                      onClick={() => move(table, id, -1)}
                      aria-label={`Move ${label} left`}
                      title={`Move ${label} left`}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="grt-menu__action"
                      disabled={index === order.length - 1}
                      onClick={() => move(table, id, 1)}
                      aria-label={`Move ${label} right`}
                      title={`Move ${label} right`}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className={`grt-menu__action${pinned === 'start' ? ' grt-menu__action--on' : ''}`}
                      onClick={() => pinColumn(table, id, pinned !== 'start')}
                      aria-pressed={pinned === 'start'}
                      aria-label={`Keep ${label} in view while scrolling sideways`}
                      title={`Keep ${label} in view while scrolling sideways`}
                    >
                      ⇤
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="grt-menu__footer">
            <button
              type="button"
              className="grt-toolbar__link"
              onClick={() => {
                table.resetColumnVisibility();
                table.resetColumnOrder();
                table.resetColumnPinning();
                table.resetColumnSizing();
              }}
            >
              Reset columns
            </button>
          </div>
        </>
      )}
    </Dropdown>
  );
};
