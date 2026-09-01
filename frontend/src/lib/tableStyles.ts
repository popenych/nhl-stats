import type { CSSProperties } from 'react'

// Pins a table's leading column (player/team name) in place while the rest
// scrolls horizontally, with a thick border marking it off — the same
// visual language as the "own stats" column in the player/team compare
// tables. Needs an explicit background since sticky cells sit on top of the
// columns scrolling behind them.
export const STICKY_FIRST_COL: CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  backgroundColor: 'var(--mantine-color-body)',
  borderRight: '2px solid var(--mantine-color-default-border)',
}

// Forces a column to size to its content on one line rather than wrapping
// (e.g. a "records" cell with a team logo + abbreviation + GP/record text) —
// pairs with Table.ScrollContainer, which is already how these wide tables
// handle overflow, so a cramped column should scroll rather than squish.
export const NOWRAP: CSSProperties = { whiteSpace: 'nowrap' }
