import { Link, useParams } from 'react-router-dom'
import { Paper, Stack, Table, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as placesApi from '../../api/places'
import * as statsApi from '../../api/stats'
import { GamesMiniTable } from '../../components/GamesMiniTable'
import { formatRecord } from '../../lib/record'

export function PlacePage() {
  const { id } = useParams()
  const placeId = Number(id)

  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })
  const place = places?.find((p) => p.id === placeId)

  const { data: summary } = useQuery({
    queryKey: ['place-summary', placeId],
    queryFn: () => statsApi.getPlaceSummary(placeId),
  })

  if (!place) return null

  return (
    <Stack>
      <Title order={2}>{place.name}</Title>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Standings
        </Title>
        {!summary || summary.standings.length === 0 ? (
          <Text c="dimmed" size="sm">
            No games played here yet.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={360}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>GP</Table.Th>
                  <Table.Th>Record</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {summary.standings.map((s) => (
                  <Table.Tr key={s.player.id}>
                    <Table.Td>
                      <Text component={Link} to={`/players/${s.player.id}`}>
                        {s.player.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{s.games_played}</Table.Td>
                    <Table.Td>{formatRecord(s.wins, s.losses, s.ties)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      <GamesMiniTable filters={{ place_id: placeId }} />
    </Stack>
  )
}
