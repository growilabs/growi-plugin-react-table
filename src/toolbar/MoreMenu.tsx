import type { PluginTable } from '../table/tableTypes';
import { Dropdown } from './Dropdown';
import { MoreIcon } from './icons';
import type { ToolbarUiState } from './toolbarState';

type Props = {
  table: PluginTable;
  ui: ToolbarUiState;
  onUiChange: (next: ToolbarUiState) => void;
  labels: Map<string, string>;
};

/**
 * The features that stay out of the way until asked for.
 *
 * Row selection, row pinning and grouping turn a table into something you operate rather
 * than read. They are all here, all off, and none of them changes the table until it is
 * switched on — which is the whole point of keeping them behind one more click.
 */
export const MoreMenu = ({ table, ui, onUiChange, labels }: Props) => {
  const grouping = table.state.grouping ?? [];
  const groupedBy = grouping[0] ?? '';

  return (
    <Dropdown label="More options" icon={<MoreIcon />}>
      {() => (
        <>
          <ul className="grt-menu">
            <li className="grt-menu__item">
              <label className="grt-menu__toggle">
                <input
                  type="checkbox"
                  checked={ui.rowSelection}
                  onChange={(event) => {
                    // Turning it off must not leave rows selected behind the scenes.
                    if (!event.target.checked) {
                      table.resetRowSelection();
                    }
                    onUiChange({ ...ui, rowSelection: event.target.checked });
                  }}
                />
                <span className="grt-menu__label">Select rows</span>
              </label>
            </li>

            <li className="grt-menu__item">
              <label className="grt-menu__toggle">
                <input
                  type="checkbox"
                  checked={ui.rowPinning}
                  onChange={(event) => {
                    if (!event.target.checked) {
                      table.resetRowPinning();
                    }
                    onUiChange({ ...ui, rowPinning: event.target.checked });
                  }}
                />
                <span className="grt-menu__label">Pin rows</span>
              </label>
            </li>
          </ul>

          <div className="grt-menu__footer">
            <label className="grt-menu__toggle">
              <span className="grt-menu__label">Group by</span>
              <select
                className="grt-filters__control"
                value={groupedBy}
                aria-label="Group rows by column"
                onChange={(event) => {
                  const value = event.target.value;
                  // Groups come up expanded; see `initialState.expanded` in EnhancedTable.
                  table.setGrouping(value === '' ? [] : [value]);
                }}
              >
                <option value="">Nothing</option>
                {table.getAllLeafColumns().map((column) => (
                  <option key={column.id} value={column.id}>
                    {labels.get(column.id) ?? column.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
    </Dropdown>
  );
};
