import { useNavigate } from 'react-router-dom'
import { Paper, Table, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as gamesApi from '../api/games'
import type { GameFilters } from '../api/games'

export function GamesMiniTable({ filters }: { filters: GameFilters }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.listGames(filters),
  })

  if (isLoading) return null

  if (!data || data.items.length === 0) {
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
              <Table.Th>Date</Table.Th>
              <Table.Th>Matchup</Table.Th>
              <Table.Th>Score</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.items.map((g) => (
              <Table.Tr
                key={g.id}
                onClick={() => navigate(`/games/${g.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>{g.date}</Table.Td>
                <Table.Td>
                  {g.home.player.name} ({g.home.team.abbreviation}) vs {g.away.player.name} (
                  {g.away.team.abbreviation})
                </Table.Td>
                <Table.Td>
                  {g.home.goals} - {g.away.goals}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  )
}
