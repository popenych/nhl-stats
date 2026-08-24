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
import { TrendChart } from '../components/TrendChart'

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

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', metric, seasonIdNum],
    queryFn: () => statsApi.getLeaderboard(metric, seasonIdNum),
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

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Leaderboard</Title>
          <Select
            data={METRIC_OPTIONS}
            value={metric}
            onChange={(v) => v && setMetric(v as MetricKey)}
            w={140}
            allowDeselect={false}
          />
        </Group>
        {!leaderboard || leaderboard.entries.length === 0 ? (
          <Text c="dimmed" size="sm">
            No games yet.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={360}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>GP</Table.Th>
                  <Table.Th>{METRIC_LABELS[metric]}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {leaderboard.entries.map((e) => (
                  <Table.Tr key={e.player.id}>
                    <Table.Td>
                      <Text component={Link} to={`/players/${e.player.id}`}>
                        {e.player.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{e.games_played}</Table.Td>
                    <Table.Td>
                      {metric === 'win_pct' ||
                      metric === 'shooting_pct' ||
                      metric === 'pp_pct' ||
                      metric === 'pk_pct' ||
                      metric === 'faceoff_pct'
                        ? `${(e.value * 100).toFixed(0)}%`
                        : e.value.toFixed(2)}
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
          Recent games
        </Title>
        <GamesMiniTable filters={{ season_id: seasonIdNum, page_size: 10 }} />
      </Paper>
    </Stack>
  )
}
