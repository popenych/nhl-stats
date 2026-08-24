import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Group, Paper, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as playersApi from '../../api/players'
import * as statsApi from '../../api/stats'
import { useAuth } from '../../auth/auth-context-value'
import { GamesMiniTable } from '../../components/GamesMiniTable'
import { HeadToHeadTable } from '../../components/HeadToHeadTable'
import { StatsSummaryGrid } from '../../components/StatsSummaryGrid'
import { TrendChart } from '../../components/TrendChart'

export function PlayerPage() {
  const { id } = useParams()
  const playerId = Number(id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [opponentId, setOpponentId] = useState<string | null>(null)

  const { data: player } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => playersApi.getPlayer(playerId),
  })

  const { data: allPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: playersApi.listPlayers,
  })

  const { data: summary } = useQuery({
    queryKey: ['player-summary', playerId],
    queryFn: () => statsApi.getPlayerSummary(playerId),
  })

  const { data: trend } = useQuery({
    queryKey: ['player-trend', playerId],
    queryFn: () => statsApi.getTrend({ metric: 'win_pct', x: 'date', playerId }),
  })

  const { data: h2h } = useQuery({
    queryKey: ['h2h', playerId, opponentId],
    queryFn: () => statsApi.getHeadToHead(playerId, Number(opponentId)),
    enabled: opponentId !== null,
  })

  const updateMutation = useMutation({
    mutationFn: (newName: string) => playersApi.updatePlayer(playerId, { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player', playerId] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      notifications.show({ message: 'Player updated', color: 'green' })
      setEditing(false)
    },
    onError: () => notifications.show({ message: 'Failed to update player', color: 'red' }),
  })

  if (!player) return null

  const canEdit = user?.role === 'admin' || user?.player.id === playerId
  const opponentOptions = (allPlayers ?? [])
    .filter((p) => p.id !== playerId)
    .map((p) => ({ value: String(p.id), label: p.name }))
  const opponentName = (allPlayers ?? []).find((p) => String(p.id) === opponentId)?.name

  return (
    <Stack>
      <Group justify="space-between">
        {editing ? (
          <Group>
            <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <Button onClick={() => updateMutation.mutate(name)} loading={updateMutation.isPending}>
              Save
            </Button>
            <Button variant="subtle" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Group>
        ) : (
          <Title order={2}>{player.name}</Title>
        )}
        {canEdit && !editing && (
          <Button
            variant="light"
            onClick={() => {
              setName(player.name)
              setEditing(true)
            }}
          >
            Edit
          </Button>
        )}
      </Group>

      {summary && (
        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            Stats
          </Title>
          <StatsSummaryGrid summary={summary} />
        </Paper>
      )}

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Win % trend
        </Title>
        <TrendChart trend={trend} />
      </Paper>

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Head-to-head</Title>
          <Select
            placeholder="Pick an opponent"
            data={opponentOptions}
            value={opponentId}
            onChange={setOpponentId}
            w={200}
            searchable
          />
        </Group>
        {!opponentId ? (
          <Text c="dimmed" size="sm">
            Pick an opponent to see their record against {player.name}.
          </Text>
        ) : !h2h || h2h.games_played === 0 ? (
          <Text c="dimmed" size="sm">
            No games played against each other yet.
          </Text>
        ) : (
          <HeadToHeadTable h2h={h2h} />
        )}
      </Paper>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          {opponentId ? `Games vs ${opponentName ?? ''}` : 'Recent games'}
        </Title>
        <GamesMiniTable
          filters={{ player_id: playerId }}
          highlightPlayerId={playerId}
          opponentId={opponentId ? Number(opponentId) : undefined}
        />
      </Paper>
    </Stack>
  )
}
