import { useNavigate } from 'react-router-dom'
import { Paper, Table, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as gamesApi from '../api/games'
import type { GameFilters } from '../api/games'
import { formatDateDisplay } from '../lib/date'
import { myOutcome, teamOutcome } from '../lib/gameOutcome'
import { GameResultCell } from './GameResultCell'

export function GamesMiniTable({
  filters,
  highlightPlayerId,
  highlightTeamId,
  opponentId,
}: {
  filters: GameFilters
  highlightPlayerId?: number
  highlightTeamId?: number
  opponentId?: number
}) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.listGames(filters),
  })

  if (isLoading) return null

  const items = opponentId
    ? (data?.items ?? []).filter(
        (g) => g.home.player.id === opponentId || g.away.player.id === opponentId,
      )
    : (data?.items ?? [])

  if (items.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No games yet.
      </Text>
    )
  }

  return (
    <Paper withBorder p="md">
      <Table.ScrollContainer minWidth={420}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Result</Table.Th>
              <Table.Th ta="right">Date</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((g) => {
              const outcome = highlightTeamId
                ? teamOutcome(g, highlightTeamId)
                : myOutcome(g, highlightPlayerId)
              return (
                <Table.Tr
                  key={g.id}
                  onClick={() => navigate(`/games/${g.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>
                    <GameResultCell game={g} outcome={outcome} />
                  </Table.Td>
                  <Table.Td ta="right">{formatDateDisplay(g.date)}</Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  )
}
