import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Group, Paper, Select, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as seasonsApi from '../api/seasons'
import * as statsApi from '../api/stats'
import type { MetricKey } from '../api/types'
import { METRIC_LABELS } from '../api/types'
import { useAuth } from '../auth/auth-context-value'
import { GamesMiniTable } from '../components/GamesMiniTable'
import { Last5 } from '../components/Last5'
import { TrendChart } from '../components/TrendChart'
import { formatMMSS } from '../lib/time'
import { formatRecord } from '../lib/record'

const METRIC_OPTIONS = (Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => ({
  value: key,
  label: METRIC_LABELS[key],
}))

export function Home() {
  const { user } = useAuth()
  // undefined = user hasn't touched the selector yet, so it defaults to the
  // newest season once seasons load; '' means "All-time" was explicitly chosen.
  const [chosenSeasonId, setChosenSeasonId] = useState<string | null | undefined>(undefined)
  const [metric, setMetric] = useState<MetricKey>('win_pct')
  const [xAxis, setXAxis] = useState<'date' | 'games_played'>('date')

  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })

  const newestSeasonId =
    seasons && seasons.length > 0
      ? String(seasons.reduce((a, b) => (b.sort_order > a.sort_order ? b : a)).id)
      : null
  const seasonId = chosenSeasonId === undefined ? newestSeasonId : chosenSeasonId

  const seasonIdNum = seasonId ? Number(seasonId) : undefined

  const { data: standings } = useQuery({
    queryKey: ['players-summary', seasonIdNum],
    queryFn: () => statsApi.getAllPlayerSummaries(seasonIdNum),
  })

  const { data: allTimeStandings } = useQuery({
    queryKey: ['players-summary', 'all-time'],
    queryFn: () => statsApi.getAllPlayerSummaries(undefined),
  })

  const { data: trend } = useQuery({
    queryKey: ['trend', metric, xAxis, seasonIdNum],
    queryFn: () => statsApi.getTrend({ metric, x: xAxis, seasonId: seasonIdNum }),
  })

  const seasonOptions = [
    { value: '', label: 'All-time' },
    ...(seasons ?? []).map((s) => ({ value: String(s.id), label: s.name })),
  ]

  return (
    <Stack>
      <Group justify="space-between" wrap="wrap">
        <Title order={2}>Welcome, {user?.player.name}</Title>
        <Select
          data={seasonOptions}
          value={seasonId ?? ''}
          onChange={(v) => setChosenSeasonId(v || null)}
          w={180}
          allowDeselect={false}
        />
      </Group>

      {allTimeStandings && allTimeStandings.length > 0 && (
        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            All-time
          </Title>
          <Table.ScrollContainer minWidth={280}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>Record</Table.Th>
                  <Table.Th>W%</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {allTimeStandings.map((row) => (
                  <Table.Tr key={row.player.id}>
                    <Table.Td>
                      <Text component={Link} to={`/players/${row.player.id}`}>
                        {row.player.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {formatRecord(row.summary.wins, row.summary.losses, row.summary.ties)}
                    </Table.Td>
                    <Table.Td>{(row.summary.win_pct * 100).toFixed(1)}%</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Leaderboard
        </Title>
        {!standings || standings.length === 0 ? (
          <Text c="dimmed" size="sm">
            No games yet.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={860}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>GP</Table.Th>
                  <Table.Th>W%</Table.Th>
                  <Table.Th>Record</Table.Th>
                  <Table.Th>GF-GA</Table.Th>
                  <Table.Th>SH%</Table.Th>
                  <Table.Th>PP%</Table.Th>
                  <Table.Th>PK%</Table.Th>
                  <Table.Th>FOW%</Table.Th>
                  <Table.Th>TOA avg</Table.Th>
                  <Table.Th>Last 5</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {standings.map((row) => (
                  <Table.Tr key={row.player.id}>
                    <Table.Td>
                      <Text component={Link} to={`/players/${row.player.id}`}>
                        {row.player.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{row.summary.games_played}</Table.Td>
                    <Table.Td>{(row.summary.win_pct * 100).toFixed(1)}%</Table.Td>
                    <Table.Td>
                      {formatRecord(row.summary.wins, row.summary.losses, row.summary.ties)}
                    </Table.Td>
                    <Table.Td>
                      {row.summary.goals_for}-{row.summary.goals_against}
                    </Table.Td>
                    <Table.Td>{(row.summary.shooting_pct * 100).toFixed(1)}%</Table.Td>
                    <Table.Td>{(row.summary.pp_pct * 100).toFixed(1)}%</Table.Td>
                    <Table.Td>{(row.summary.pk_pct * 100).toFixed(1)}%</Table.Td>
                    <Table.Td>{(row.summary.faceoff_pct * 100).toFixed(1)}%</Table.Td>
                    <Table.Td>
                      {formatMMSS(Math.round(row.summary.time_on_attack_avg_seconds))}
                    </Table.Td>
                    <Table.Td>
                      <Last5 value={row.summary.last5} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
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
          filters={{ player_id: user?.player.id, season_id: seasonIdNum, page_size: 10 }}
          highlightPlayerId={user?.player.id}
        />
      </Paper>
    </Stack>
  )
}
