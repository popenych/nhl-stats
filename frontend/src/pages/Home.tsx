import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import {
  IconFlame,
  IconSnowflake,
  IconTarget,
  IconTrendingDown,
  IconTrendingUp,
  IconTrophy,
  IconUsers,
  IconX,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'

import * as placesApi from '../api/places'
import * as seasonsApi from '../api/seasons'
import * as statsApi from '../api/stats'
import * as teamsApi from '../api/teams'
import type {
  MetricKey,
  PlayerExtras,
  PlayerSummaryRow,
  PlayerTeamSummaryRow,
  SideFilter,
  TeamExtras,
} from '../api/types'
import { useAuth } from '../auth/auth-context-value'
import { GameRecordCell } from '../components/GameRecordCell'
import { GamesMiniTable } from '../components/GamesMiniTable'
import { Last5 } from '../components/Last5'
import { PlayerRecordValue } from '../components/PlayerRecordCell'
import { StatHeader } from '../components/StatHeader'
import { TeamLogo } from '../components/TeamLogo'
import { TeamRecordValue } from '../components/TeamRecordCell'
import { TrendChart } from '../components/TrendChart'
import { signColor } from '../lib/colors'
import { formatRecord } from '../lib/record'
import {
  LEADERBOARD_COLUMNS,
  METRIC_OPTIONS,
  SIDE_OPTIONS,
  sortByField,
  SORT_FIELDS,
  statByKey,
} from '../lib/stats'
import { NOWRAP, STICKY_FIRST_COL } from '../lib/tableStyles'

const ALL_TIME_SORT_VALUES = new Set(['win_pct', 'wins', 'losses'])
const ALL_TIME_SORT_FIELDS = SORT_FIELDS.filter((f) => ALL_TIME_SORT_VALUES.has(f.value))

function SortSelect({
  fields,
  value,
  onChange,
}: {
  fields: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select
      label="Sort by"
      data={fields}
      value={value}
      onChange={(v) => v && onChange(v)}
      w={160}
      allowDeselect={false}
    />
  )
}

const goalDiffField = statByKey('goal_diff')

// Same "records" stats shown at the bottom of the Player/Team compare
// tables (see PLAYER_EXTRAS_ROWS/TEAM_EXTRAS_ROWS), reused here as trailing
// columns on the wide leaderboard-shaped tables instead of rows — every
// player/team gets their own column value instead of comparing 2-4 side by
// side.
interface ExtraColumn<TExtras> {
  key: string
  icon: ReactNode
  short: string
  full: string
  render: (extras: TExtras | null | undefined) => ReactNode
}

const PLAYER_EXTRA_COLUMNS: ExtraColumn<PlayerExtras>[] = [
  {
    key: 'best_win_streak',
    icon: <IconFlame size={14} />,
    short: 'Best W streak',
    full: 'Best win streak',
    render: (e) => e?.best_win_streak ?? '—',
  },
  {
    key: 'worst_lose_streak',
    icon: <IconSnowflake size={14} />,
    short: 'Worst L streak',
    full: 'Worst lose streak',
    render: (e) => e?.worst_lose_streak ?? '—',
  },
  {
    key: 'most_played_team',
    icon: <IconUsers size={14} />,
    short: 'Most GP w/',
    full: 'Most GP with',
    render: (e) => <TeamRecordValue record={e?.most_played_team ?? null} />,
  },
  {
    key: 'most_wins_team',
    icon: <IconTrophy size={14} />,
    short: 'Most W w/',
    full: 'Most wins with',
    render: (e) => <TeamRecordValue record={e?.most_wins_team ?? null} />,
  },
  {
    key: 'most_losses_team',
    icon: <IconX size={14} />,
    short: 'Most L w/',
    full: 'Most losses with',
    render: (e) => <TeamRecordValue record={e?.most_losses_team ?? null} />,
  },
  {
    key: 'best_diff_game',
    icon: <IconTrendingUp size={14} />,
    short: 'Best Δ',
    full: 'Best game (diff)',
    render: (e) => <GameRecordCell record={e?.best_diff_game ?? null} mode="diff" />,
  },
  {
    key: 'worst_diff_game',
    icon: <IconTrendingDown size={14} />,
    short: 'Worst Δ',
    full: 'Worst game (diff)',
    render: (e) => <GameRecordCell record={e?.worst_diff_game ?? null} mode="diff" />,
  },
  {
    key: 'best_gf_game',
    icon: <IconTarget size={14} />,
    short: 'Best GF',
    full: 'Best game (GF)',
    render: (e) => <GameRecordCell record={e?.best_gf_game ?? null} mode="gf" />,
  },
  {
    key: 'worst_ga_game',
    icon: <IconX size={14} />,
    short: 'Worst GA',
    full: 'Worst game (GA)',
    render: (e) => <GameRecordCell record={e?.worst_ga_game ?? null} mode="ga" />,
  },
]

const TEAM_EXTRA_COLUMNS: ExtraColumn<TeamExtras>[] = [
  {
    key: 'best_win_streak',
    icon: <IconFlame size={14} />,
    short: 'Best W streak',
    full: 'Best win streak',
    render: (e) => e?.best_win_streak ?? '—',
  },
  {
    key: 'worst_lose_streak',
    icon: <IconSnowflake size={14} />,
    short: 'Worst L streak',
    full: 'Worst lose streak',
    render: (e) => e?.worst_lose_streak ?? '—',
  },
  {
    key: 'most_played_player',
    icon: <IconUsers size={14} />,
    short: 'Most GP',
    full: 'Most GP',
    render: (e) => <PlayerRecordValue record={e?.most_played_player ?? null} />,
  },
  {
    key: 'most_wins_player',
    icon: <IconTrophy size={14} />,
    short: 'Most W',
    full: 'Most wins',
    render: (e) => <PlayerRecordValue record={e?.most_wins_player ?? null} />,
  },
  {
    key: 'most_losses_player',
    icon: <IconX size={14} />,
    short: 'Most L',
    full: 'Most losses',
    render: (e) => <PlayerRecordValue record={e?.most_losses_player ?? null} />,
  },
  {
    key: 'best_diff_game',
    icon: <IconTrendingUp size={14} />,
    short: 'Best Δ',
    full: 'Best game (diff)',
    render: (e) => <GameRecordCell record={e?.best_diff_game ?? null} mode="diff" />,
  },
  {
    key: 'worst_diff_game',
    icon: <IconTrendingDown size={14} />,
    short: 'Worst Δ',
    full: 'Worst game (diff)',
    render: (e) => <GameRecordCell record={e?.worst_diff_game ?? null} mode="diff" />,
  },
  {
    key: 'best_gf_game',
    icon: <IconTarget size={14} />,
    short: 'Best GF',
    full: 'Best game (GF)',
    render: (e) => <GameRecordCell record={e?.best_gf_game ?? null} mode="gf" />,
  },
  {
    key: 'worst_ga_game',
    icon: <IconX size={14} />,
    short: 'Worst GA',
    full: 'Worst game (GA)',
    render: (e) => <GameRecordCell record={e?.worst_ga_game ?? null} mode="ga" />,
  },
]

function StandingsTable({
  rows,
  sortBy,
  onSortChange,
  sortFields,
  minWidth,
}: {
  rows: PlayerSummaryRow[]
  sortBy: string
  onSortChange: (v: string) => void
  sortFields: { value: string; label: string }[]
  minWidth: number
}) {
  const sorted = sortByField(rows, sortBy)
  return (
    <Stack gap="sm">
      <Group justify="flex-end">
        <SortSelect fields={sortFields} value={sortBy} onChange={onSortChange} />
      </Group>
      {sorted.length === 0 ? (
        <Text c="dimmed" size="sm">
          No games yet.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={minWidth}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={STICKY_FIRST_COL}>Player</Table.Th>
                <Table.Th>GP</Table.Th>
                <Table.Th>W%</Table.Th>
                <Table.Th>Record</Table.Th>
                {LEADERBOARD_COLUMNS.map((col) => (
                  <Table.Th key={col.key}>
                    <StatHeader field={col} />
                  </Table.Th>
                ))}
                <Table.Th>Last 5</Table.Th>
                {PLAYER_EXTRA_COLUMNS.map((col) => (
                  <Table.Th key={col.key} style={NOWRAP}>
                    <StatHeader field={col} />
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sorted.map((row) => (
                <Table.Tr key={row.player.id}>
                  <Table.Td style={STICKY_FIRST_COL}>
                    <Text component={Link} to={`/players/${row.player.id}`}>
                      {row.player.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>{row.summary.games_played}</Table.Td>
                  <Table.Td>{(row.summary.win_pct * 100).toFixed(1)}%</Table.Td>
                  <Table.Td>
                    {formatRecord(row.summary.wins, row.summary.losses, row.summary.ties)}
                  </Table.Td>
                  {LEADERBOARD_COLUMNS.map((col) =>
                    col.key === 'goal_diff' ? (
                      <Table.Td key={col.key}>
                        <span style={{ color: signColor(row.summary.goal_diff) }}>
                          {goalDiffField.format(row.summary)}
                        </span>
                      </Table.Td>
                    ) : (
                      <Table.Td key={col.key}>{col.format(row.summary)}</Table.Td>
                    ),
                  )}
                  <Table.Td>
                    <Last5 value={row.summary.last5} />
                  </Table.Td>
                  {PLAYER_EXTRA_COLUMNS.map((col) => (
                    <Table.Td key={col.key} style={NOWRAP}>
                      {col.render(row.extras)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  )
}

// Same shape as StandingsTable, but rows are teams (aggregated across every
// player who's worn each one) instead of players — mirrors PlayerPage's
// "Stats by team" table, just across the whole group instead of one player.
function TeamStandingsTable({
  rows,
  sortBy,
  onSortChange,
  minGamesPlayed,
  onMinGamesPlayedChange,
  minWidth,
}: {
  rows: PlayerTeamSummaryRow[]
  sortBy: string
  onSortChange: (v: string) => void
  minGamesPlayed: number
  onMinGamesPlayedChange: (v: number) => void
  minWidth: number
}) {
  const filtered = rows.filter((r) => r.summary.games_played >= minGamesPlayed)
  const sorted = sortByField(filtered, sortBy)
  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="wrap">
        <NumberInput
          label="Min games played"
          value={minGamesPlayed}
          onChange={(v) => onMinGamesPlayedChange(typeof v === 'number' ? v : 0)}
          min={0}
          w={160}
        />
        <SortSelect fields={SORT_FIELDS} value={sortBy} onChange={onSortChange} />
      </Group>
      {sorted.length === 0 ? (
        <Text c="dimmed" size="sm">
          No teams match this filter.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={minWidth}>
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
                {TEAM_EXTRA_COLUMNS.map((col) => (
                  <Table.Th key={col.key} style={NOWRAP}>
                    <StatHeader field={col} />
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sorted.map((row) => {
                const played = row.summary.games_played > 0
                return (
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
                    {!played ? (
                      <>
                        <Table.Td c="dimmed">—</Table.Td>
                        <Table.Td c="dimmed">—</Table.Td>
                        {LEADERBOARD_COLUMNS.map((col) => (
                          <Table.Td key={col.key} c="dimmed">
                            —
                          </Table.Td>
                        ))}
                        <Table.Td c="dimmed">—</Table.Td>
                      </>
                    ) : (
                      <>
                        <Table.Td>{(row.summary.win_pct * 100).toFixed(1)}%</Table.Td>
                        <Table.Td>
                          {formatRecord(row.summary.wins, row.summary.losses, row.summary.ties)}
                        </Table.Td>
                        {LEADERBOARD_COLUMNS.map((col) =>
                          col.key === 'goal_diff' ? (
                            <Table.Td key={col.key}>
                              <span style={{ color: signColor(row.summary.goal_diff) }}>
                                {goalDiffField.format(row.summary)}
                              </span>
                            </Table.Td>
                          ) : (
                            <Table.Td key={col.key}>{col.format(row.summary)}</Table.Td>
                          ),
                        )}
                        <Table.Td>
                          <Last5 value={row.summary.last5} />
                        </Table.Td>
                      </>
                    )}
                    {TEAM_EXTRA_COLUMNS.map((col) => (
                      <Table.Td key={col.key} style={NOWRAP}>
                        {col.render(row.extras)}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  )
}

export function Home() {
  const { user } = useAuth()
  // undefined = user hasn't touched the selector yet, so it defaults to the
  // newest season once seasons load; '' means "All-time" was explicitly chosen.
  const [chosenSeasonId, setChosenSeasonId] = useState<string | null | undefined>(undefined)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [side, setSide] = useState<SideFilter | ''>('')
  const [metric, setMetric] = useState<MetricKey>('win_pct')
  const [xAxis, setXAxis] = useState<'date' | 'games_played'>('date')
  const [allTimeSortBy, setAllTimeSortBy] = useState('win_pct')
  const [leaderboardSortBy, setLeaderboardSortBy] = useState('win_pct')
  const [teamStandingsSortBy, setTeamStandingsSortBy] = useState('win_pct')
  const [minGamesPlayed, setMinGamesPlayed] = useState(0)

  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })

  const newestSeasonId =
    seasons && seasons.length > 0
      ? String(seasons.reduce((a, b) => (b.sort_order > a.sort_order ? b : a)).id)
      : null
  const seasonId = chosenSeasonId === undefined ? newestSeasonId : chosenSeasonId

  const seasonIdNum = seasonId ? Number(seasonId) : undefined
  const teamIdNum = teamId ? Number(teamId) : undefined
  const placeIdNum = placeId ? Number(placeId) : undefined
  const sideFilter = side || undefined

  const { data: standings } = useQuery({
    queryKey: ['players-summary', seasonIdNum, teamIdNum, placeIdNum, sideFilter],
    queryFn: () =>
      statsApi.getAllPlayerSummaries({
        seasonId: seasonIdNum,
        teamId: teamIdNum,
        placeId: placeIdNum,
        side: sideFilter,
      }),
  })

  const { data: allTimeStandings } = useQuery({
    queryKey: ['players-summary', 'all-time'],
    queryFn: () => statsApi.getAllPlayerSummaries(),
  })

  // Team filter doesn't apply here — filtering "teams" down to one specific
  // team would leave a single-row table, so this only respects season/place/side.
  const { data: teamStandings } = useQuery({
    queryKey: ['teams-summary', seasonIdNum, placeIdNum, sideFilter],
    queryFn: () =>
      statsApi.getAllTeamSummaries({
        seasonId: seasonIdNum,
        placeId: placeIdNum,
        side: sideFilter,
      }),
  })

  const { data: trend } = useQuery({
    queryKey: ['trend', metric, xAxis, seasonIdNum, teamIdNum, placeIdNum, sideFilter],
    queryFn: () =>
      statsApi.getTrend({
        metric,
        x: xAxis,
        seasonId: seasonIdNum,
        teamId: teamIdNum,
        placeId: placeIdNum,
        side: sideFilter,
      }),
  })

  const seasonOptions = [
    { value: '', label: 'All-time' },
    ...(seasons ?? []).map((s) => ({
      value: String(s.id),
      label: s.icon ? `${s.icon} ${s.name}` : s.name,
    })),
  ]
  const teamOptions = [
    { value: '', label: 'All teams' },
    ...(teams ?? []).map((t) => ({
      value: String(t.id),
      label: `${t.name} (${t.abbreviation})`,
    })),
  ]
  const placeOptions = [
    { value: '', label: 'All places' },
    ...(places ?? []).map((p) => ({
      value: String(p.id),
      label: p.icon ? `${p.icon} ${p.name}` : p.name,
    })),
  ]
  const selectedTeam = (teams ?? []).find((t) => String(t.id) === teamId)

  return (
    <Stack>
      <Title order={2}>Welcome, {user?.player.name}</Title>

      {allTimeStandings && allTimeStandings.length > 0 && (
        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            All-time
          </Title>
          <StandingsTable
            rows={allTimeStandings}
            sortBy={allTimeSortBy}
            onSortChange={setAllTimeSortBy}
            sortFields={ALL_TIME_SORT_FIELDS}
            minWidth={2600}
          />
        </Paper>
      )}

      <Paper withBorder p="md">
        <Group gap="sm" wrap="wrap">
          <Select
            label="Season"
            data={seasonOptions}
            value={seasonId ?? ''}
            onChange={(v) => setChosenSeasonId(v || null)}
            w={160}
            allowDeselect={false}
          />
          <Select
            label="Team"
            data={teamOptions}
            value={teamId ?? ''}
            onChange={(v) => setTeamId(v || null)}
            leftSection={selectedTeam ? <TeamLogo team={selectedTeam} size={18} /> : undefined}
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

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Leaderboard
        </Title>
        <StandingsTable
          rows={standings ?? []}
          sortBy={leaderboardSortBy}
          onSortChange={setLeaderboardSortBy}
          sortFields={SORT_FIELDS}
          minWidth={2600}
        />
      </Paper>

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Trend</Title>
          <SimpleGrid cols={2} spacing="xs" w={260}>
            <Select
              data={METRIC_OPTIONS}
              value={metric}
              onChange={(v) => v && setMetric(v as MetricKey)}
              allowDeselect={false}
            />
            <Select
              data={[
                { value: 'date', label: 'By date' },
                { value: 'games_played', label: 'By games played' },
              ]}
              value={xAxis}
              onChange={(v) => v && setXAxis(v as 'date' | 'games_played')}
              allowDeselect={false}
            />
          </SimpleGrid>
        </Group>
        <TrendChart trend={trend} />
      </Paper>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          By team
        </Title>
        <TeamStandingsTable
          rows={teamStandings ?? []}
          sortBy={teamStandingsSortBy}
          onSortChange={setTeamStandingsSortBy}
          minGamesPlayed={minGamesPlayed}
          onMinGamesPlayedChange={setMinGamesPlayed}
          minWidth={2600}
        />
      </Paper>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Your recent games
        </Title>
        <GamesMiniTable
          filters={{
            player_id: user?.player.id,
            season_id: seasonIdNum,
            team_id: teamIdNum,
            place_id: placeIdNum,
            side: sideFilter,
            page_size: 10,
          }}
          highlightPlayerId={user?.player.id}
        />
      </Paper>
    </Stack>
  )
}
