import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, FileButton, Group, Paper, Select, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconFlame,
  IconPhoto,
  IconSnowflake,
  IconTarget,
  IconTrendingDown,
  IconTrendingUp,
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
import type { MetricKey, Player, SideFilter, TeamExtras } from '../../api/types'
import { useAuth } from '../../auth/auth-context-value'
import { GameRecordCell } from '../../components/GameRecordCell'
import { GamesMiniTable } from '../../components/GamesMiniTable'
import { PlayerRecordValue } from '../../components/PlayerRecordCell'
import type { CompareColumn, ExtraRow } from '../../components/StatsCompareTable'
import { StatsCompareTable } from '../../components/StatsCompareTable'
import { TeamLogo } from '../../components/TeamLogo'
import { TrendChart } from '../../components/TrendChart'
import { COMPARE_TABLE_ROWS, METRIC_OPTIONS, SIDE_OPTIONS } from '../../lib/stats'

// Records section for the team compare table (team overall + up to 3 player
// slots). All four columns share the TeamExtras shape — the per-player-slot
// columns just always have most_played/wins/losses_player set to null
// (nothing to vary once both player and team are fixed), which
// PlayerRecordValue already renders as "—".
const TEAM_EXTRAS_ROWS: ExtraRow<TeamExtras>[] = [
  {
    key: 'best_win_streak',
    icon: <IconFlame size={14} />,
    label: 'Best win streak',
    render: (e) => e?.best_win_streak ?? '—',
  },
  {
    key: 'worst_lose_streak',
    icon: <IconSnowflake size={14} />,
    label: 'Worst lose streak',
    render: (e) => e?.worst_lose_streak ?? '—',
  },
  {
    key: 'most_played_player',
    icon: <IconUsers size={14} />,
    label: 'Most GP',
    render: (e) => <PlayerRecordValue record={e?.most_played_player ?? null} />,
  },
  {
    key: 'most_wins_player',
    icon: <IconTrophy size={14} />,
    label: 'Most wins',
    render: (e) => <PlayerRecordValue record={e?.most_wins_player ?? null} />,
  },
  {
    key: 'most_losses_player',
    icon: <IconX size={14} />,
    label: 'Most losses',
    render: (e) => <PlayerRecordValue record={e?.most_losses_player ?? null} />,
  },
  {
    key: 'best_diff_game',
    icon: <IconTrendingUp size={14} />,
    label: 'Best game (diff)',
    render: (e) => <GameRecordCell record={e?.best_diff_game ?? null} mode="diff" />,
  },
  {
    key: 'worst_diff_game',
    icon: <IconTrendingDown size={14} />,
    label: 'Worst game (diff)',
    render: (e) => <GameRecordCell record={e?.worst_diff_game ?? null} mode="diff" />,
  },
  {
    key: 'best_gf_game',
    icon: <IconTarget size={14} />,
    label: 'Best game (GF)',
    render: (e) => <GameRecordCell record={e?.best_gf_game ?? null} mode="gf" />,
  },
  {
    key: 'worst_ga_game',
    icon: <IconX size={14} />,
    label: 'Worst game (GA)',
    render: (e) => <GameRecordCell record={e?.worst_ga_game ?? null} mode="ga" />,
  },
]

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

function useSlotExtras(
  playerId: number | undefined,
  teamId: number,
  filters: { seasonId?: number; placeId?: number; side?: SideFilter },
) {
  return useQuery({
    queryKey: ['team-compare-extras', playerId, teamId, filters],
    queryFn: () => statsApi.getPlayerTeamExtras(playerId as number, teamId, filters),
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
  const { data: leftExtras } = useSlotExtras(effectiveLeft, teamId, statsFilters)
  const { data: midExtras } = useSlotExtras(effectiveMid, teamId, statsFilters)
  const { data: rightExtras } = useSlotExtras(effectiveRight, teamId, statsFilters)

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

  const compareColumns: CompareColumn<TeamExtras>[] = [
    {
      header: <Text fw={700}>{team.abbreviation} overall</Text>,
      summary: summary,
      extras: extras,
    },
    {
      header: (
        <ColumnHeader players={allPlayers ?? []} value={effectiveLeft} onChange={setLeftId} />
      ),
      summary: leftSummary,
      extras: leftExtras,
      thickBorderBefore: true,
    },
    {
      header: <ColumnHeader players={allPlayers ?? []} value={effectiveMid} onChange={setMidId} />,
      summary: midSummary,
      extras: midExtras,
    },
    {
      header: (
        <ColumnHeader players={allPlayers ?? []} value={effectiveRight} onChange={setRightId} />
      ),
      summary: rightSummary,
      extras: rightExtras,
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

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Stats
        </Title>
        <StatsCompareTable
          extraRows={TEAM_EXTRAS_ROWS}
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
