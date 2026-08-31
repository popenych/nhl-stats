import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Group, Paper, Select, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as placesApi from '../api/places'
import * as seasonsApi from '../api/seasons'
import * as statsApi from '../api/stats'
import * as teamsApi from '../api/teams'
import type { MetricKey, PlayerSummaryRow, SideFilter } from '../api/types'
import { useAuth } from '../auth/auth-context-value'
import { GamesMiniTable } from '../components/GamesMiniTable'
import { Last5 } from '../components/Last5'
import { StatHeader } from '../components/StatHeader'
import { TeamLogo } from '../components/TeamLogo'
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
import { STICKY_FIRST_COL } from '../lib/tableStyles'

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
                </Table.Tr>
              ))}
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
    ...(teams ?? []).map((t) => ({ value: String(t.id), label: t.name })),
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
            minWidth={1400}
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
          minWidth={1400}
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
