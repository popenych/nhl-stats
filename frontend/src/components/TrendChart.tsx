import { LineChart } from '@mantine/charts'
import { Text } from '@mantine/core'

import type { TrendResponse } from '../api/types'

const COLORS = ['blue.6', 'red.6', 'green.6', 'yellow.6', 'grape.6', 'cyan.6', 'orange.6']

const PCT_METRICS = new Set(['win_pct', 'shooting_pct', 'pp_pct', 'pk_pct', 'faceoff_pct'])

export function TrendChart({ trend }: { trend: TrendResponse | undefined }) {
  if (!trend || trend.series.every((s) => s.points.length === 0)) {
    return (
      <Text c="dimmed" size="sm">
        Not enough games yet for a trend.
      </Text>
    )
  }

  const xValues = Array.from(new Set(trend.series.flatMap((s) => s.points.map((p) => p.x))))
  xValues.sort((a, b) =>
    trend.x_axis === 'games_played' ? Number(a) - Number(b) : a.localeCompare(b)
  )

  const data = xValues.map((x) => {
    const row: Record<string, string | number | null> = { x }
    for (const s of trend.series) {
      const point = s.points.find((p) => p.x === x)
      row[s.player.name] = point ? point.value : null
    }
    return row
  })

  const series = trend.series.map((s, i) => ({
    name: s.player.name,
    color: COLORS[i % COLORS.length],
  }))

  const isPct = PCT_METRICS.has(trend.metric)

  return (
    <LineChart
      h={280}
      data={data}
      dataKey="x"
      series={series}
      curveType="monotone"
      connectNulls
      withLegend
      withDots={data.length <= 30}
      valueFormatter={(v) => (isPct ? `${(v * 100).toFixed(0)}%` : v.toFixed(2))}
      xAxisLabel={trend.x_axis === 'games_played' ? 'Games played' : 'Date'}
    />
  )
}
