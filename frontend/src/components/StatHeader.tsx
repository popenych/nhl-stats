import type { ReactNode } from 'react'
import { Group, Tooltip } from '@mantine/core'

// A compact column header (icon + short name) that reveals the stat's full
// name on hover — used wherever a table shows short names to save space.
// Accepts anything shaped like a StatField (or a lighter-weight column
// descriptor, e.g. the "records" columns on the Home leaderboard).
export function StatHeader({ field }: { field: { icon: ReactNode; short: string; full: string } }) {
  return (
    <Tooltip label={field.full} withArrow openDelay={200}>
      <Group gap={4} wrap="nowrap" style={{ cursor: 'default' }}>
        {field.icon}
        {field.short}
      </Group>
    </Tooltip>
  )
}
