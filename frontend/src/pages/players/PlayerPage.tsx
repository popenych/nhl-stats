import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Group, Paper, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconFlame, IconSnowflake, IconTrophy, IconUsers, IconX } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as placesApi from '../../api/places'
import * as playersApi from '../../api/players'
import * as seasonsApi from '../../api/seasons'
import * as statsApi from '../../api/stats'
import * as teamsApi from '../../api/teams'
import type { MetricKey, PlayerTeamSummaryRow, SideFilter, TeamRecord } from '../../api/types'
import { useAuth } from '../../auth/auth-context-value'
import { GamesMiniTable } from '../../components/GamesMiniTable'
import { Last5 } from '../../components/Last5'
import { StatHeader } from '../../components/StatHeader'
import type { CompareColumn } from '../../components/StatsCompareTable'
import { StatsCompareTable } from '../../components/StatsCompareTable'
import { TeamLogo } from '../../components/TeamLogo'
import { TrendChart } from '../../components/TrendChart'
import { formatRecord } from '../../lib/record'
import {
  COMPARE_TABLE_ROWS,
  LEADERBOARD_COLUMNS,
  METRIC_OPTIONS,
  SIDE_OPTIONS,
  SORT_FIELDS,
  sortByField,
} from '../../lib/stats'
import { STICKY_FIRST_COL } from '../../lib/tableStyles'

function TeamRecordValue({ record }: { record: TeamRecord | null }) {
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

// Rows = every team this player has worn, each with its own full stats —
// shaped like the Home leaderboard, but keyed by team instead of by player.
function TeamBreakdownTable({
  rows,
  sortBy,
  onSortChange,
}: {
  rows: PlayerTeamSummaryRow[]
  sortBy: string
  onSortChange: (v: string) => void
}) {
  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No games yet.
      </Text>
    )
  }
  const sorted = sortByField(rows, sortBy)
  return (
    <Stack gap="sm">
      <Group justify="flex-end">
        <Select
          label="Sort by"
          data={SORT_FIELDS}
          value={sortBy}
          onChange={(v) => v && onSortChange(v)}
          w={160}
          allowDeselect={false}
        />
      </Group>
      <Table.ScrollContainer minWidth={1400}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={STICKY_FIRST_COL}>Team</Table.Th>
              <Table.Th>GP</Table.Th>
              <Table.Th>W%</Table.Th>
              <Table.Th>Record</Table.Th>
              {LEADERBOARD_COLUMNS.map((col) => (
                <Table.Th key={col.key}>
                  <StatHeader field={col} />
                </Table.Th>
              ))}
              <Table.Th>Last 5</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((row) => (
              <Table.Tr key={row.team.id}>
                <Table.Td style={STICKY_FIRST_COL}>
                  <Group gap={6} wrap="nowrap">
                    <Link to={`/teams/${row.team.id}`}>
                      <TeamLogo team={row.team} size={20} />
                    </Link>
                    <Text component={Link} to={`/teams/${row.team.id}`}>
                      {row.team.abbreviation}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>{row.summary.games_played}</Table.Td>
                <Table.Td>{(row.summary.win_pct * 100).toFixed(1)}%</Table.Td>
                <Table.Td>
                  {formatRecord(row.summary.wins, row.summary.losses, row.summary.ties)}
                </Table.Td>
                {LEADERBOARD_COLUMNS.map((col) => (
                  <Table.Td key={col.key}>{col.format(row.summary)}</Table.Td>
                ))}
                <Table.Td>
                  <Last5 value={row.summary.last5} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  )
}

export function PlayerPage() {
  const { id } = useParams()
  const playerId = Number(id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [opponentId, setOpponentId] = useState<string | null>(null)

  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [teamIdMe, setTeamIdMe] = useState<string | null>(null)
  const [teamIdOpponent, setTeamIdOpponent] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [side, setSide] = useState<SideFilter | ''>('')
  const [metric, setMetric] = useState<MetricKey>('win_pct')
  const [byTeamSortBy, setByTeamSortBy] = useState('win_pct')

  const seasonIdNum = seasonId ? Number(seasonId) : undefined
  const teamIdMeNum = teamIdMe ? Number(teamIdMe) : undefined
  const teamIdOpponentNum = teamIdOpponent ? Number(teamIdOpponent) : undefined
  const placeIdNum = placeId ? Number(placeId) : undefined
  const sideFilter = side || undefined

  const { data: player } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => playersApi.getPlayer(playerId),
  })

  const { data: allPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: playersApi.listPlayers,
  })

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })

  const commonFilters = { seasonId: seasonIdNum, placeId: placeIdNum, side: sideFilter }

  const { data: summary } = useQuery({
    queryKey: ['player-summary', playerId, teamIdMeNum, commonFilters],
    queryFn: () => statsApi.getPlayerSummary(playerId, { ...commonFilters, teamId: teamIdMeNum }),
  })

  const { data: extras } = useQuery({
    queryKey: ['player-extras', playerId, commonFilters],
    queryFn: () => statsApi.getPlayerExtras(playerId, commonFilters),
  })

  const { data: byTeam } = useQuery({
    queryKey: ['player-by-team', playerId, commonFilters],
    queryFn: () => statsApi.getPlayerTeamBreakdown(playerId, commonFilters),
  })

  const { data: trend } = useQuery({
    queryKey: ['trend', metric, playerId, teamIdMeNum, commonFilters],
    queryFn: () => statsApi.getTrend({ metric, x: 'date', teamId: teamIdMeNum, ...commonFilters }),
  })

  const { data: h2h } = useQuery({
    queryKey: ['h2h', playerId, opponentId, teamIdMeNum, teamIdOpponentNum, commonFilters],
    queryFn: () =>
      statsApi.getHeadToHead(playerId, Number(opponentId), {
        ...commonFilters,
        teamIdA: teamIdMeNum,
        teamIdB: teamIdOpponentNum,
      }),
    enabled: opponentId !== null,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; icon: string }) =>
      playersApi.updatePlayer(playerId, { name: data.name, icon: data.icon }),
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
    .map((p) => ({ value: String(p.id), label: p.icon ? `${p.icon} ${p.name}` : p.name }))
  const opponentName = (allPlayers ?? []).find((p) => String(p.id) === opponentId)?.name

  const seasonOptions = [
    { value: '', label: 'All-time' },
    ...(seasons ?? []).map((s) => ({
      value: String(s.id),
      label: s.icon ? `${s.icon} ${s.name}` : s.name,
    })),
  ]
  const teamOptions = [
    { value: '', label: 'All teams' },
    ...(teams ?? []).map((t) => ({ value: String(t.id), label: t.name })),
  ]
  const placeOptions = [
    { value: '', label: 'All places' },
    ...(places ?? []).map((p) => ({
      value: String(p.id),
      label: p.icon ? `${p.icon} ${p.name}` : p.name,
    })),
  ]
  const selectedTeamMe = (teams ?? []).find((t) => String(t.id) === teamIdMe)
  const selectedTeamOpponent = (teams ?? []).find((t) => String(t.id) === teamIdOpponent)

  const compareColumns: CompareColumn[] = [
    { header: <Text fw={700}>{player.name} overall</Text>, summary: summary },
    {
      header: (
        <Text fw={700} size="sm">
          {opponentName ? `${player.name} vs ${opponentName}` : `${player.name} vs —`}
        </Text>
      ),
      summary: h2h?.player_a_summary,
      thickBorderBefore: true,
    },
    {
      header: (
        <Select
          placeholder="Pick an opponent"
          data={opponentOptions}
          value={opponentId}
          onChange={setOpponentId}
          searchable
        />
      ),
      summary: h2h?.player_b_summary,
    },
  ]

  return (
    <Stack>
      <Group justify="space-between">
        {editing ? (
          <Group>
            <TextInput
              value={icon}
              onChange={(e) => setIcon(e.currentTarget.value)}
              placeholder="Icon"
              w={70}
            />
            <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <Button
              onClick={() => updateMutation.mutate({ name, icon })}
              loading={updateMutation.isPending}
            >
              Save
            </Button>
            <Button variant="subtle" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Group>
        ) : (
          <Title order={2}>
            {player.icon ? `${player.icon} ` : ''}
            {player.name}
          </Title>
        )}
        {canEdit && !editing && (
          <Button
            variant="light"
            onClick={() => {
              setName(player.name)
              setIcon(player.icon ?? '')
              setEditing(true)
            }}
          >
            Edit
          </Button>
        )}
      </Group>

      <Paper withBorder p="md">
        <Group gap="sm" wrap="wrap">
          <Select
            label="Season"
            data={seasonOptions}
            value={seasonId ?? ''}
            onChange={(v) => setSeasonId(v || null)}
            w={160}
          />
          <Select
            label="Team (me)"
            data={teamOptions}
            value={teamIdMe ?? ''}
            onChange={(v) => setTeamIdMe(v || null)}
            leftSection={selectedTeamMe ? <TeamLogo team={selectedTeamMe} size={18} /> : undefined}
            w={180}
            searchable
          />
          <Select
            label="Team (opponent)"
            data={teamOptions}
            value={teamIdOpponent ?? ''}
            onChange={(v) => setTeamIdOpponent(v || null)}
            leftSection={
              selectedTeamOpponent ? <TeamLogo team={selectedTeamOpponent} size={18} /> : undefined
            }
            w={180}
            searchable
          />
          <Select
            label="Place"
            data={placeOptions}
            value={placeId ?? ''}
            onChange={(v) => setPlaceId(v || null)}
            w={180}
            searchable
          />
          <Select
            label="Home / Guest"
            data={SIDE_OPTIONS}
            value={side}
            onChange={(v) => setSide((v as SideFilter | '') || '')}
            w={160}
            allowDeselect={false}
          />
        </Group>
      </Paper>

      {extras && (
        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            Team Records
          </Title>
          <Stack gap="xs">
            <Group justify="space-between">
              <Group gap={6}>
                <IconFlame size={14} />
                <Text size="sm">Best win streak</Text>
              </Group>
              <Text fw={700}>{extras.best_win_streak}</Text>
            </Group>
            <Group justify="space-between">
              <Group gap={6}>
                <IconSnowflake size={14} />
                <Text size="sm">Worst lose streak</Text>
              </Group>
              <Text fw={700}>{extras.worst_lose_streak}</Text>
            </Group>
            <Group justify="space-between">
              <Group gap={6}>
                <IconUsers size={14} />
                <Text size="sm">Most GP with</Text>
              </Group>
              <TeamRecordValue record={extras.most_played_team} />
            </Group>
            <Group justify="space-between">
              <Group gap={6}>
                <IconTrophy size={14} />
                <Text size="sm">Most wins with</Text>
              </Group>
              <TeamRecordValue record={extras.most_wins_team} />
            </Group>
            <Group justify="space-between">
              <Group gap={6}>
                <IconX size={14} />
                <Text size="sm">Most losses with</Text>
              </Group>
              <TeamRecordValue record={extras.most_losses_team} />
            </Group>
          </Stack>
        </Paper>
      )}

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Stats
        </Title>
        <StatsCompareTable
          rows={COMPARE_TABLE_ROWS}
          columns={compareColumns}
          highlightIndices={[1, 2]}
          highlightMode="green-red"
          minWidth={500}
        />
      </Paper>

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Trend</Title>
          <Select
            data={METRIC_OPTIONS}
            value={metric}
            onChange={(v) => v && setMetric(v as MetricKey)}
            w={200}
            searchable
          />
        </Group>
        <TrendChart trend={trend} />
      </Paper>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Stats by team
        </Title>
        <TeamBreakdownTable
          rows={byTeam ?? []}
          sortBy={byTeamSortBy}
          onSortChange={setByTeamSortBy}
        />
      </Paper>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          {opponentId ? `Games vs ${opponentName ?? ''}` : 'Recent games'}
        </Title>
        <GamesMiniTable
          filters={{
            player_id: playerId,
            season_id: seasonIdNum,
            team_id: teamIdMeNum,
            place_id: placeIdNum,
            side: sideFilter,
            // opponentId narrows client-side (see GamesMiniTable) rather than
            // via a server-side query — the default page size (20) would
            // silently drop shared games older than the player's 20 most
            // recent, so fetch the max page instead whenever it's active.
            page_size: opponentId ? 100 : undefined,
          }}
          highlightPlayerId={playerId}
          opponentId={opponentId ? Number(opponentId) : undefined}
        />
      </Paper>
    </Stack>
  )
}
