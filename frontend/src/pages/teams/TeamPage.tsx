import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, FileButton, Group, Paper, Select, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconFlame,
  IconPhoto,
  IconSnowflake,
  IconTrophy,
  IconUsers,
  IconX,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as placesApi from '../../api/places'
import * as playersApi from '../../api/players'
import * as seasonsApi from '../../api/seasons'
import * as statsApi from '../../api/stats'
import * as teamsApi from '../../api/teams'
import type { MetricKey, Player, PlayerRecord, SideFilter } from '../../api/types'
import { useAuth } from '../../auth/auth-context-value'
import { GamesMiniTable } from '../../components/GamesMiniTable'
import type { CompareColumn } from '../../components/StatsCompareTable'
import { StatsCompareTable } from '../../components/StatsCompareTable'
import { TeamLogo } from '../../components/TeamLogo'
import { TrendChart } from '../../components/TrendChart'
import { formatRecord } from '../../lib/record'
import { COMPARE_TABLE_ROWS, METRIC_OPTIONS, SIDE_OPTIONS } from '../../lib/stats'

function PlayerRecordValue({ record }: { record: PlayerRecord | null }) {
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

function ColumnHeader({
  players,
  value,
  onChange,
}: {
  players: Player[]
  value: number | undefined
  onChange: (id: number) => void
}) {
  const options = players.map((p) => ({
    value: String(p.id),
    label: p.icon ? `${p.icon} ${p.name}` : p.name,
  }))
  return (
    <Select
      data={options}
      value={value !== undefined ? String(value) : null}
      onChange={(v) => v && onChange(Number(v))}
      searchable
    />
  )
}

function defaultSlots(
  allPlayers: Player[],
  ownPlayerId: number | undefined,
): [number?, number?, number?] {
  if (allPlayers.length === 0) return [undefined, undefined, undefined]
  const left = allPlayers.find((p) => p.id === ownPlayerId) ?? allPlayers[0]
  const others = allPlayers.filter((p) => p.id !== left.id)
  return [left.id, others[0]?.id, others[1]?.id]
}

function useSlotSummary(
  playerId: number | undefined,
  teamId: number,
  filters: { seasonId?: number; placeId?: number; side?: SideFilter },
) {
  return useQuery({
    queryKey: ['team-compare-summary', playerId, teamId, filters],
    queryFn: () => statsApi.getPlayerSummary(playerId as number, { ...filters, teamId }),
    enabled: playerId !== undefined,
  })
}

export function TeamPage() {
  const { id } = useParams()
  const teamId = Number(id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [metric, setMetric] = useState<MetricKey>('win_pct')

  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [side, setSide] = useState<SideFilter | ''>('')

  const seasonIdNum = seasonId ? Number(seasonId) : undefined
  const placeIdNum = placeId ? Number(placeId) : undefined
  const sideFilter = side || undefined

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsApi.getTeam(teamId),
  })

  const { data: allPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: playersApi.listPlayers,
  })

  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })

  const statsFilters = { seasonId: seasonIdNum, placeId: placeIdNum, side: sideFilter }

  const { data: summary } = useQuery({
    queryKey: ['team-summary', teamId, statsFilters],
    queryFn: () => statsApi.getTeamSummary(teamId, statsFilters),
  })

  const { data: extras } = useQuery({
    queryKey: ['team-extras', teamId, statsFilters],
    queryFn: () => statsApi.getTeamExtras(teamId, statsFilters),
  })

  const { data: trend } = useQuery({
    queryKey: ['team-trend', metric, teamId, seasonIdNum, placeIdNum, sideFilter],
    queryFn: () =>
      statsApi.getTrend({
        metric,
        x: 'date',
        teamId,
        seasonId: seasonIdNum,
        placeId: placeIdNum,
        side: sideFilter,
      }),
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => teamsApi.uploadTeamLogo(teamId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      notifications.show({ message: 'Logo updated', color: 'green' })
    },
    onError: () => notifications.show({ message: 'Failed to upload logo', color: 'red' }),
  })

  const [defaultLeft, defaultMid, defaultRight] = defaultSlots(allPlayers ?? [], user?.player.id)
  const [leftId, setLeftId] = useState<number | undefined>(undefined)
  const [midId, setMidId] = useState<number | undefined>(undefined)
  const [rightId, setRightId] = useState<number | undefined>(undefined)
  const effectiveLeft = leftId ?? defaultLeft
  const effectiveMid = midId ?? defaultMid
  const effectiveRight = rightId ?? defaultRight

  const { data: leftSummary } = useSlotSummary(effectiveLeft, teamId, statsFilters)
  const { data: midSummary } = useSlotSummary(effectiveMid, teamId, statsFilters)
  const { data: rightSummary } = useSlotSummary(effectiveRight, teamId, statsFilters)

  if (!team) return null

  const seasonOptions = [
    { value: '', label: 'All-time' },
    ...(seasons ?? []).map((s) => ({
      value: String(s.id),
      label: s.icon ? `${s.icon} ${s.name}` : s.name,
    })),
  ]
  const placeOptions = [
    { value: '', label: 'All places' },
    ...(places ?? []).map((p) => ({
      value: String(p.id),
      label: p.icon ? `${p.icon} ${p.name}` : p.name,
    })),
  ]

  const compareColumns: CompareColumn[] = [
    { header: <Text fw={700}>{team.abbreviation} overall</Text>, summary: summary },
    {
      header: (
        <ColumnHeader players={allPlayers ?? []} value={effectiveLeft} onChange={setLeftId} />
      ),
      summary: leftSummary,
      thickBorderBefore: true,
    },
    {
      header: <ColumnHeader players={allPlayers ?? []} value={effectiveMid} onChange={setMidId} />,
      summary: midSummary,
    },
    {
      header: (
        <ColumnHeader players={allPlayers ?? []} value={effectiveRight} onChange={setRightId} />
      ),
      summary: rightSummary,
    },
  ]

  return (
    <Stack>
      <Group justify="space-between">
        <Group>
          <TeamLogo team={team} size={40} />
          <Title order={2}>
            {team.abbreviation} — {team.name}
          </Title>
        </Group>
        {user?.role === 'admin' && (
          <FileButton onChange={(f) => f && logoMutation.mutate(f)} accept="image/*">
            {(props) => (
              <Button
                variant="light"
                leftSection={<IconPhoto size={16} />}
                loading={logoMutation.isPending}
                {...props}
              >
                {team.logo_path ? 'Change logo' : 'Add logo'}
              </Button>
            )}
          </FileButton>
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
            Player Records
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
                <Text size="sm">Most GP</Text>
              </Group>
              <PlayerRecordValue record={extras.most_played_player} />
            </Group>
            <Group justify="space-between">
              <Group gap={6}>
                <IconTrophy size={14} />
                <Text size="sm">Most wins</Text>
              </Group>
              <PlayerRecordValue record={extras.most_wins_player} />
            </Group>
            <Group justify="space-between">
              <Group gap={6}>
                <IconX size={14} />
                <Text size="sm">Most losses</Text>
              </Group>
              <PlayerRecordValue record={extras.most_losses_player} />
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
          highlightIndices={[1, 2, 3]}
          highlightMode="green-only"
          minWidth={600}
        />
      </Paper>

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Trend, per player</Title>
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

      <GamesMiniTable
        filters={{
          team_id: teamId,
          season_id: seasonIdNum,
          place_id: placeIdNum,
          side: sideFilter,
        }}
        highlightTeamId={teamId}
      />
    </Stack>
  )
}
