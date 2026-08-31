import type { CSSProperties, ReactNode } from 'react'
import { Group, Table, Text } from '@mantine/core'

import type { StatsSummary } from '../api/types'
import { ATOM_GREEN, ATOM_RED } from '../lib/colors'
import type { StatField } from '../lib/stats'
import { highlightColors } from '../lib/stats'
import { Last5 } from './Last5'

const THICK_BORDER: CSSProperties = {
  borderLeft: '2px solid var(--mantine-color-default-border)',
}

export interface CompareColumn<TExtras = never> {
  header: ReactNode
  summary: StatsSummary | undefined
  // Records data for this column (streaks, most-played-with, best/worst
  // game) — rendered by `extraRows` below the Last 5 row. Optional: a
  // column with no extras support (or none loaded yet) just renders "—".
  extras?: TExtras
  // Draws a heavier left border before this column — used to visually
  // separate an "own stats" column from a group of compared columns.
  thickBorderBefore?: boolean
}

// One row in the records section — same shape as StatField's icon/label,
// but `render` takes the column's `extras` value (a page-specific type,
// e.g. PlayerExtras or TeamExtras) instead of a StatsSummary, since records
// aren't part of the StatField/metric registry.
export interface ExtraRow<TExtras> {
  key: string
  icon: ReactNode
  label: string
  render: (extras: TExtras | undefined) => ReactNode
}

// Shared N-column stat table: one row per stat, one column per entity being
// compared (a team + up to 3 players, or a player + a head-to-head
// opponent). `highlightIndices` names which columns participate in the
// best/worst text-color comparison (see lib/stats.ts's highlightColors) —
// columns outside that set (e.g. an "overall" column) are shown but never
// colored. `highlightMode: 'green-only'` skips coloring the losers, for a
// 3-way compare where "worse than the other two" isn't a meaningful single
// verdict the way it is head-to-head.
export function StatsCompareTable<TExtras = never>({
  rows,
  columns,
  highlightIndices,
  highlightMode,
  minWidth = 400,
  extraRows,
}: {
  rows: StatField[]
  columns: CompareColumn<TExtras>[]
  highlightIndices: number[]
  highlightMode: 'green-only' | 'green-red'
  minWidth?: number
  extraRows?: ExtraRow<TExtras>[]
}) {
  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            {columns.map((col, i) => (
              <Table.Th key={i} ta="right" style={col.thickBorderBefore ? THICK_BORDER : undefined}>
                {col.header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((field) => {
            const colors = highlightColors(
              field,
              columns.map((c) => c.summary),
              highlightIndices,
            )
            return (
              <Table.Tr key={field.key}>
                <Table.Td>
                  <Group gap={4} wrap="nowrap">
                    {field.icon}
                    <Text size="sm" c="dimmed">
                      {field.full}
                    </Text>
                  </Group>
                </Table.Td>
                {columns.map((col, i) => {
                  const color = colors.get(i)
                  const applyColor =
                    color === 'green' || (color === 'red' && highlightMode === 'green-red')
                  const hasData = col.summary && col.summary.games_played > 0
                  return (
                    <Table.Td
                      key={i}
                      ta="right"
                      style={col.thickBorderBefore ? THICK_BORDER : undefined}
                    >
                      {hasData ? (
                        <span
                          style={{
                            color: applyColor
                              ? color === 'green'
                                ? ATOM_GREEN
                                : ATOM_RED
                              : undefined,
                          }}
                        >
                          {field.format(col.summary as StatsSummary)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                  )
                })}
              </Table.Tr>
            )
          })}
          <Table.Tr>
            <Table.Td>
              <Text size="sm" c="dimmed">
                Streak
              </Text>
            </Table.Td>
            {columns.map((col, i) => (
              <Table.Td key={i} ta="right" style={col.thickBorderBefore ? THICK_BORDER : undefined}>
                {col.summary ? col.summary.current_streak || '—' : '—'}
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr>
            <Table.Td>
              <Text size="sm" c="dimmed">
                Last 5
              </Text>
            </Table.Td>
            {columns.map((col, i) => (
              <Table.Td key={i} ta="right" style={col.thickBorderBefore ? THICK_BORDER : undefined}>
                {col.summary?.last5 ? <Last5 value={col.summary.last5} /> : '—'}
              </Table.Td>
            ))}
          </Table.Tr>
          {extraRows?.map((row) => (
            <Table.Tr key={row.key}>
              <Table.Td>
                <Group gap={4} wrap="nowrap">
                  {row.icon}
                  <Text size="sm" c="dimmed">
                    {row.label}
                  </Text>
                </Group>
              </Table.Td>
              {columns.map((col, i) => (
                <Table.Td
                  key={i}
                  ta="right"
                  style={col.thickBorderBefore ? THICK_BORDER : undefined}
                >
                  {row.render(col.extras)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
