import { Link } from 'react-router-dom'
import { Group, Text } from '@mantine/core'

import type { TeamRecord } from '../api/types'
import { formatRecord } from '../lib/record'
import { TeamLogo } from './TeamLogo'

// Renders a "most GP/wins/losses with a team" record — GP+record, then the
// team's abbreviation and logo, linking out to that team.
export function TeamRecordValue({ record }: { record: TeamRecord | null }) {
  if (!record) return <Text c="dimmed">—</Text>
  return (
    <Group gap={6} justify="flex-end" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {record.games_played} GP,{' '}
        {formatRecord(
          record.wins,
          record.losses,
          record.games_played - record.wins - record.losses,
        )}
      </Text>
      <Text component={Link} to={`/teams/${record.team.id}`} fw={700} size="sm">
        {record.team.abbreviation}
      </Text>
      <Link to={`/teams/${record.team.id}`}>
        <TeamLogo team={record.team} size={20} />
      </Link>
    </Group>
  )
}
