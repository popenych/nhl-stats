import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Group, Image, Paper, Table, Text, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as gamesApi from '../../api/games'
import { useAuth } from '../../auth/auth-context-value'
import { formatMMSS } from '../../lib/time'

const STAT_ROWS: { label: string; format: (v: number) => string; key: string }[] = [
  { label: 'Total shots', key: 'shots', format: String },
  { label: 'Hits', key: 'hits', format: String },
  { label: 'Time on attack', key: 'time_on_attack_seconds', format: formatMMSS },
  { label: 'Passing', key: 'passing_pct', format: (v) => `${v}%` },
  { label: 'Faceoffs won', key: 'faceoffs_won', format: String },
  { label: 'Penalty minutes', key: 'penalty_minutes_seconds', format: formatMMSS },
  { label: 'Powerplay minutes', key: 'powerplay_minutes_seconds', format: formatMMSS },
  { label: 'Shorthanded goals', key: 'shorthanded_goals', format: String },
]

export function GameDetail() {
  const { id } = useParams()
  const gameId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => gamesApi.getGame(gameId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => gamesApi.deleteGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      notifications.show({ message: 'Game deleted', color: 'green' })
      navigate('/games')
    },
    onError: () => notifications.show({ message: 'Failed to delete game', color: 'red' }),
  })

  if (isLoading || !game) return null

  const canEdit =
    user?.role === 'admin' ||
    user?.player.id === game.home.player.id ||
    user?.player.id === game.away.player.id

  function confirmDelete() {
    modals.openConfirmModal({
      title: 'Delete this game?',
      children: <Text size="sm">This can't be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(),
    })
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>
          {game.home.player.name} vs {game.away.player.name} — {game.date}
        </Title>
        {canEdit && (
          <Group>
            <Button component={Link} to={`/games/${game.id}/edit`} variant="light">
              Edit
            </Button>
            <Button color="red" variant="light" onClick={confirmDelete}>
              Delete
            </Button>
          </Group>
        )}
      </Group>

      <Group align="flex-start" gap="lg">
        <Image
          src={gamesApi.photoUrl(game.photo_path)}
          radius="sm"
          w="100%"
          maw={400}
          fit="contain"
        />

        <Paper withBorder p="md" style={{ flex: 1, minWidth: 280 }}>
          <Table.ScrollContainer minWidth={340}>
            <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  {game.home.player.name} ({game.home.team.abbreviation})
                </Table.Th>
                <Table.Th ta="center">Score</Table.Th>
                <Table.Th ta="right">
                  {game.away.player.name} ({game.away.team.abbreviation})
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={700}>{game.home.goals}</Table.Td>
                <Table.Td ta="center">Goals</Table.Td>
                <Table.Td fw={700} ta="right">
                  {game.away.goals}
                </Table.Td>
              </Table.Tr>
              {STAT_ROWS.map((row) => (
                <Table.Tr key={row.key}>
                  <Table.Td>
                    {row.format(game.home[row.key as keyof typeof game.home] as number)}
                  </Table.Td>
                  <Table.Td ta="center" c="dimmed">
                    {row.label}
                  </Table.Td>
                  <Table.Td ta="right">
                    {row.format(game.away[row.key as keyof typeof game.away] as number)}
                  </Table.Td>
                </Table.Tr>
              ))}
              <Table.Tr>
                <Table.Td>
                  {game.home.powerplay_goals}/{game.home.powerplay_total}
                </Table.Td>
                <Table.Td ta="center" c="dimmed">
                  Powerplays
                </Table.Td>
                <Table.Td ta="right">
                  {game.away.powerplay_goals}/{game.away.powerplay_total}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="sm" c="dimmed" mt="sm">
            {game.season.name} · {game.place.name}
          </Text>
          {game.notes && (
            <Text size="sm" mt="xs">
              {game.notes}
            </Text>
          )}
        </Paper>
      </Group>
    </>
  )
}
