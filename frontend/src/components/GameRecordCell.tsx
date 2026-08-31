import { Link } from 'react-router-dom'
import { Group, Text } from '@mantine/core'

import type { GameRecord } from '../api/types'
import { TeamLogo } from './TeamLogo'

// Renders a single standout game (best/worst diff, best GF, worst GA) as a
// score + opponent logo + the specific highlighted value, linking to the
// game itself. `mode` picks which number from the record is the headline.
export function GameRecordCell({
  record,
  mode,
}: {
  record: GameRecord | null
  mode: 'diff' | 'gf' | 'ga'
}) {
  if (!record) return <Text c="dimmed">—</Text>

  const headline =
    mode === 'diff'
      ? record.diff > 0
        ? `+${record.diff}`
        : String(record.diff)
      : mode === 'gf'
        ? String(record.own_goals)
        : String(record.opp_goals)

  return (
    <Group gap={6} justify="flex-end" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {record.own_goals}-{record.opp_goals}
      </Text>
      <TeamLogo team={record.opp_team} size={18} />
      <Text component={Link} to={`/games/${record.game_id}`} fw={700} size="sm">
        {headline}
      </Text>
    </Group>
  )
}
