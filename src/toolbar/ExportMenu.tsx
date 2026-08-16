import { useState } from 'react';
import type { PluginTable } from '../table/tableTypes';
import { Dropdown } from './Dropdown';
import { ExportIcon } from './icons';

type Props = {
  table: PluginTable;
  labels: Map<string, string>;
};

/**
 * The rows and columns currently on screen, as a grid of strings.
 *
 * What you see is what you get: filtered-out rows and hidden columns are not in the
 * export. An export that quietly included rows the reader had filtered away would be a
 * different table from the one they were looking at.
 */
const visibleGrid = (table: PluginTable, labels: Map<string, string>): string[][] => {
  const columns = table.getVisibleLeafColumns();
  const header = columns.map((column) => labels.get(column.id) ?? column.id);

  const rows = table.getFilteredRowModel().rows.map((row) => columns.map((column) => String(row.getValue(column.id) ?? '')));

  return [header, ...rows];
};

/** RFC 4180: quote when the value contains a delimiter, a quote or a newline. */
const csvCell = (value: string): string => (/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

const toCsv = (grid: string[][]): string => grid.map((row) => row.map(csvCell).join(',')).join('\r\n');

/** Tab-separated, because that is what a spreadsheet accepts from the clipboard. */
const toTsv = (grid: string[][]): string => grid.map((row) => row.map((cell) => cell.replaceAll('\t', ' ')).join('\t')).join('\n');

export const ExportMenu = ({ table, labels }: Props) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toTsv(visibleGrid(table, labels)));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /*
       * Clipboard access can be refused — an insecure origin, or a permission the user
       * declined. Staying silent would look like the copy worked.
       */
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([toCsv(visibleGrid(table, labels))], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'table.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <Dropdown label="Export" icon={<ExportIcon />}>
      {(close) => (
        <ul className="grt-menu">
          <li className="grt-menu__item">
            <button
              type="button"
              className="grt-menu__command"
              onClick={() => {
                void copy();
              }}
            >
              {copied ? 'Copied' : 'Copy to clipboard'}
            </button>
          </li>
          <li className="grt-menu__item">
            <button
              type="button"
              className="grt-menu__command"
              onClick={() => {
                download();
                close();
              }}
            >
              Download as CSV
            </button>
          </li>
        </ul>
      )}
    </Dropdown>
  );
};
