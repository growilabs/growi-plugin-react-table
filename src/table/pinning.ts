import type { CSSProperties } from 'react';
import type { PluginColumn, PluginTable } from './tableTypes';

/**
 * Only one column can be pinned, and only to the start edge.
 *
 * Sticky offsets for a second pinned column would have to be computed from the first
 * one's rendered width, and TanStack's column sizes are nominal (150px unless a column
 * has been resized). One pinned column sits flush against the edge, which is always
 * right; a row of columns pinned at plausible-but-wrong offsets is worse than not
 * offering it at all.
 *
 * v9 names the edges `start`/`end` rather than left/right, so this follows the writing
 * direction — which matters for the RTL locales GROWI supports.
 */
export const pinColumn = (table: PluginTable, id: string, pinned: boolean): void => {
  table.setColumnPinning({ start: pinned ? [id] : [], end: [] });
};

export const pinnedStyleFor = (column: PluginColumn): CSSProperties | undefined =>
  column.getIsPinned() === 'start'
    ? {
        position: 'sticky',
        insetInlineStart: 0,
        // Above the scrolling cells, below the toolbar's dropdown panels.
        zIndex: 1,
      }
    : undefined;
