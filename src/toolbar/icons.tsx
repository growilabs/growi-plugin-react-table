import type { SVGProps } from 'react';

/*
 * Inline SVG rather than an icon font.
 *
 * GROWI uses Material Symbols, but a plugin cannot assume the font is loaded on every
 * skin, and a missing glyph silently changes the size of a hit target. These are drawn
 * in `currentColor` so they follow the surrounding text in light and dark themes alike.
 */

type IconProps = SVGProps<SVGSVGElement>;

const Icon = ({ children, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

/** Column is sortable but not currently sorted. */
export const SortNoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 6.5 8 3.5l3 3" />
    <path d="M5 9.5 8 12.5l3-3" />
  </Icon>
);

export const SortAscIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 10.5 8 5.5l4 5" />
  </Icon>
);

export const SortDescIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 5.5 8 10.5l4-5" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="7" cy="7" r="4" />
    <path d="M10 10 13.5 13.5" />
  </Icon>
);

export const FilterIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.5 3.5h11l-4.25 5v4l-2.5 1.5v-5.5z" />
  </Icon>
);

export const ColumnsIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
    <path d="M6.2 2.5v11M9.8 2.5v11" />
  </Icon>
);

/** Clears every sort at once. Only shown while something is sorted. */
export const SortResetIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7" />
    <path d="M13.5 2.5v2.8h-2.8" />
  </Icon>
);

export const ExportIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 2.5v7.5" />
    <path d="M5 7.5 8 10.5l3-3" />
    <path d="M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 8.5 6.5 11.5l6-7" />
  </Icon>
);

/** Everything that stays out of the way until asked for. */
export const MoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="3.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);
