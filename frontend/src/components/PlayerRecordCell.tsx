import { Link } from 'react-router-dom'
import { Group, Text } from '@mantine/core'

import type { PlayerRecord } from '../api/types'
import { formatRecord } from '../lib/record'

// Renders a "most GP/wins/losses with a player" record — GP+record, then
// the player's name, linking out to that player.
export function PlayerRecordValue({ record }: { record: PlayerRecord | null }) {
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
      <Text component={Link} to={`/players/${record.player.id}`} fw={700} size="sm">
        {record.player.icon ? `${record.player.icon} ` : ''}
        {record.player.name}
      </Text>
    </Group>
  )
}
