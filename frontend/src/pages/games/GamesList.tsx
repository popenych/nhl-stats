import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionIcon, Button, Group, Paper, Select, SimpleGrid, Table, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as gamesApi from '../../api/games'
import * as placesApi from '../../api/places'
import * as playersApi from '../../api/players'
import * as seasonsApi from '../../api/seasons'
import * as teamsApi from '../../api/teams'
import { GameResultCell } from '../../components/GameResultCell'
import { TeamLogo } from '../../components/TeamLogo'
import { formatDateDisplay } from '../../lib/date'

export function GamesList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
  const selectedTeam = (teams ?? []).find((t) => String(t.id) === teamId)

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => gamesApi.deleteGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      notifications.show({ message: 'Game deleted', color: 'green' })
    },
    onError: () => notifications.show({ message: 'Failed to delete game', color: 'red' }),
  })

  function confirmDelete(id: number) {
    modals.openConfirmModal({
      title: 'Delete this game?',
      children: "This can't be undone.",
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(id),
    })
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
          data={(players ?? []).map((p) => ({
            value: String(p.id),
            label: p.icon ? `${p.icon} ${p.name}` : p.name,
          }))}
          value={playerId}
          onChange={resetPage(setPlayerId)}
        />
        <Select
          placeholder="Team"
          clearable
          searchable
          data={(teams ?? []).map((t) => ({
            value: String(t.id),
            label: `${t.name} (${t.abbreviation})`,
          }))}
          value={teamId}
          onChange={resetPage(setTeamId)}
          leftSection={selectedTeam ? <TeamLogo team={selectedTeam} size={18} /> : undefined}
        />
        <Select
          placeholder="Season"
          clearable
          data={(seasons ?? []).map((s) => ({
            value: String(s.id),
            label: s.icon ? `${s.icon} ${s.name}` : s.name,
          }))}
          value={seasonId}
          onChange={resetPage(setSeasonId)}
        />
        <Select
          placeholder="Place"
          clearable
          data={(places ?? []).map((p) => ({
            value: String(p.id),
            label: p.icon ? `${p.icon} ${p.name}` : p.name,
          }))}
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
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.items.map((g) => (
                <Table.Tr
                  key={g.id}
                  onClick={() => navigate(`/games/${g.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>{formatDateDisplay(g.date)}</Table.Td>
                  <Table.Td>
                    <GameResultCell game={g} />
                  </Table.Td>
                  <Table.Td>{g.season.name}</Table.Td>
                  <Table.Td>{g.place.name}</Table.Td>
                  <Table.Td>
                    {g.can_edit && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmDelete(g.id)
                        }}
                        aria-label="Delete game"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {!isLoading && data?.items.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>No games yet.</Table.Td>
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
