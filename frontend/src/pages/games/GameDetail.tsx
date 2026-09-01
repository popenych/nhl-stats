import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Group, Image, Paper, Stack, Table, Text, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAlertTriangle,
  IconBolt,
  IconClock,
  IconDisc,
  IconFlag,
  IconPercentage,
  IconScoreboard,
  IconShieldCheck,
  IconStopwatch,
  IconTarget,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as gamesApi from '../../api/games'
import type { Team } from '../../api/types'
import { TeamLogo } from '../../components/TeamLogo'
import { formatDateDisplay } from '../../lib/date'
import { formatMMSS } from '../../lib/time'

type StatRow = {
  label: string
  icon: ReactNode
  format: (v: number) => string
  key: string
}

// Split around the "Powerplays" fraction row (rendered separately below,
// since it combines two fields) so the full table matches the photo's
// row order: shots, hits, time on attack, passing, faceoffs won, penalty
// minutes, powerplays, powerplay minutes, shorthanded goals.
const STAT_ROWS_BEFORE_POWERPLAYS: StatRow[] = [
  { label: 'Total shots', icon: <IconTarget size={14} />, key: 'shots', format: String },
  { label: 'Hits', icon: <IconBolt size={14} />, key: 'hits', format: String },
  {
    label: 'Time on attack',
    icon: <IconStopwatch size={14} />,
    key: 'time_on_attack_seconds',
    format: formatMMSS,
  },
  {
    label: 'Passing',
    icon: <IconPercentage size={14} />,
    key: 'passing_pct',
    format: (v) => `${v}%`,
  },
  { label: 'Faceoffs won', icon: <IconDisc size={14} />, key: 'faceoffs_won', format: String },
  {
    label: 'Penalty minutes',
    icon: <IconAlertTriangle size={14} />,
    key: 'penalty_minutes_seconds',
    format: formatMMSS,
  },
]

const STAT_ROWS_AFTER_POWERPLAYS: StatRow[] = [
  {
    label: 'Powerplay minutes',
    icon: <IconClock size={14} />,
    key: 'powerplay_minutes_seconds',
    format: formatMMSS,
  },
  {
    label: 'Shorthanded goals',
    icon: <IconShieldCheck size={14} />,
    key: 'shorthanded_goals',
    format: String,
  },
]

function RowLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Group gap={4} justify="center" wrap="nowrap">
      {icon}
      <Text size="sm" c="dimmed">
        {text}
      </Text>
    </Group>
  )
}

// A dedicated, full-width matchup header instead of cramming team+player
// into a table header cell — a long player name has room to wrap onto a
// second centered line without colliding with the logo next to it.
function SideCard({ playerId, player, team }: { playerId: number; player: string; team: Team }) {
  return (
    <Stack align="center" gap={2} style={{ flex: 1, minWidth: 0 }}>
      <Link to={`/teams/${team.id}`}>
        <TeamLogo team={team} size={36} />
      </Link>
      <Text component={Link} to={`/players/${playerId}`} fw={700} size="sm" ta="center">
        {player}
      </Text>
      <Text component={Link} to={`/teams/${team.id}`} size="xs" c="dimmed">
        {team.abbreviation}
      </Text>
    </Stack>
  )
}

export function GameDetail() {
  const { id } = useParams()
  const gameId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
          {game.away.player.name} vs {game.home.player.name} — {formatDateDisplay(game.date)}
        </Title>
        {game.can_edit && (
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
          <Group justify="center" gap="md" wrap="nowrap" mb="md">
            <SideCard
              playerId={game.away.player.id}
              player={game.away.player.name}
              team={game.away.team}
            />
            <Text size="xl" fw={900} c="dimmed">
              {game.away.goals}-{game.home.goals}
            </Text>
            <SideCard
              playerId={game.home.player.id}
              player={game.home.player.name}
              team={game.home.team}
            />
          </Group>

          <Table.ScrollContainer minWidth={300}>
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={700}>{game.away.goals}</Table.Td>
                  <Table.Td>
                    <RowLabel icon={<IconScoreboard size={14} />} text="Goals" />
                  </Table.Td>
                  <Table.Td fw={700} ta="right">
                    {game.home.goals}
                  </Table.Td>
                </Table.Tr>
                {STAT_ROWS_BEFORE_POWERPLAYS.map((row) => (
                  <Table.Tr key={row.key}>
                    <Table.Td>
                      {row.format(game.away[row.key as keyof typeof game.away] as number)}
                    </Table.Td>
                    <Table.Td>
                      <RowLabel icon={row.icon} text={row.label} />
                    </Table.Td>
                    <Table.Td ta="right">
                      {row.format(game.home[row.key as keyof typeof game.home] as number)}
                    </Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr>
                  <Table.Td>
                    {game.away.powerplay_goals}/{game.away.powerplay_total}
                  </Table.Td>
                  <Table.Td>
                    <RowLabel icon={<IconFlag size={14} />} text="Powerplays" />
                  </Table.Td>
                  <Table.Td ta="right">
                    {game.home.powerplay_goals}/{game.home.powerplay_total}
                  </Table.Td>
                </Table.Tr>
                {STAT_ROWS_AFTER_POWERPLAYS.map((row) => (
                  <Table.Tr key={row.key}>
                    <Table.Td>
                      {row.format(game.away[row.key as keyof typeof game.away] as number)}
                    </Table.Td>
                    <Table.Td>
                      <RowLabel icon={row.icon} text={row.label} />
                    </Table.Td>
                    <Table.Td ta="right">
                      {row.format(game.home[row.key as keyof typeof game.home] as number)}
                    </Table.Td>
                  </Table.Tr>
                ))}
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
