import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Group, Paper, Select, SimpleGrid, Table, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'

import * as gamesApi from '../../api/games'
import * as placesApi from '../../api/places'
import * as playersApi from '../../api/players'
import * as seasonsApi from '../../api/seasons'
import * as teamsApi from '../../api/teams'
import { GameResultCell } from '../../components/GameResultCell'

export function GamesList() {
  const navigate = useNavigate()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data: players } = useQuery({ queryKey: ['players'], queryFn: playersApi.listPlayers })
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })

  const filters = {
    player_id: playerId ? Number(playerId) : undefined,
    team_id: teamId ? Number(teamId) : undefined,
    season_id: seasonId ? Number(seasonId) : undefined,
    place_id: placeId ? Number(placeId) : undefined,
    page,
    page_size: pageSize,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.listGames(filters),
  })

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setPage(1)
      setter(v)
    }
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Games</Title>
        <Button component={Link} to="/games/new" leftSection={<IconPlus size={16} />}>
          Add game
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md">
        <Select
          placeholder="Player"
          clearable
          searchable
          data={(players ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
          value={playerId}
          onChange={resetPage(setPlayerId)}
        />
        <Select
          placeholder="Team"
          clearable
          searchable
          data={(teams ?? []).map((t) => ({ value: String(t.id), label: t.abbreviation }))}
          value={teamId}
          onChange={resetPage(setTeamId)}
        />
        <Select
          placeholder="Season"
          clearable
          data={(seasons ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
          value={seasonId}
          onChange={resetPage(setSeasonId)}
        />
        <Select
          placeholder="Place"
          clearable
          data={(places ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
          value={placeId}
          onChange={resetPage(setPlaceId)}
        />
      </SimpleGrid>

      <Paper withBorder p="md">
        <Table.ScrollContainer minWidth={640}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Result</Table.Th>
                <Table.Th>Season</Table.Th>
                <Table.Th>Place</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.items.map((g) => (
                <Table.Tr
                  key={g.id}
                  onClick={() => navigate(`/games/${g.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>{g.date}</Table.Td>
                  <Table.Td>
                    <GameResultCell game={g} />
                  </Table.Td>
                  <Table.Td>{g.season.name}</Table.Td>
                  <Table.Td>{g.place.name}</Table.Td>
                </Table.Tr>
              ))}
              {!isLoading && data?.items.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>No games yet.</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && data.total > pageSize && (
        <Group justify="center" mt="md">
          <Button variant="subtle" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="subtle"
            disabled={page * pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </Group>
      )}
    </>
  )
}
