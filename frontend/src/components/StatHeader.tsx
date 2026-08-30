import { Group, Tooltip } from '@mantine/core'

import type { StatField } from '../lib/stats'

// A compact column header (icon + short name) that reveals the stat's full
// name on hover — used wherever a table shows short names to save space.
export function StatHeader({ field }: { field: StatField }) {
  return (
    <Tooltip label={field.full} withArrow openDelay={200}>
      <Group gap={4} wrap="nowrap" style={{ cursor: 'default' }}>
        {field.icon}
        {field.short}
      </Group>
    </Tooltip>
  )
}
