import { useState } from 'react'
import { LineChart } from '@mantine/charts'
import { Group, Stack, Text, UnstyledButton } from '@mantine/core'

import type { TrendResponse } from '../api/types'
import { formatDateDisplay } from '../lib/date'

const COLORS = ['blue.6', 'red.6', 'green.6', 'yellow.6', 'grape.6', 'cyan.6', 'orange.6']

const PCT_METRICS = new Set(['win_pct', 'shooting_pct', 'pp_pct', 'pk_pct', 'faceoff_pct'])

export function TrendChart({ trend }: { trend: TrendResponse | undefined }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  if (!trend || trend.series.every((s) => s.points.length === 0)) {
    return (
      <Text c="dimmed" size="sm">
        Not enough games yet for a trend.
      </Text>
    )
  }

  const xValues = Array.from(new Set(trend.series.flatMap((s) => s.points.map((p) => p.x))))
  xValues.sort((a, b) =>
    trend.x_axis === 'games_played' ? Number(a) - Number(b) : a.localeCompare(b),
  )
  const maxX = xValues[xValues.length - 1]

  // By date, players who haven't played as recently as others would
  // otherwise have their line stop short — carry each player's last value
  // forward to the latest date on the chart so lines end level and are easy
  // to compare. "Games played" has no such fix: stopping early there is the
  // real signal (fewer games logged), not a display artifact.
  const seriesPoints = trend.series.map((s) => {
    if (trend.x_axis !== 'date' || s.points.length === 0) return s.points
    const last = s.points[s.points.length - 1]
    if (last.x === maxX) return s.points
    return [...s.points, { x: maxX, value: last.value }]
  })

  const data = xValues.map((x) => {
    const row: Record<string, string | number | null> = {
      x: trend.x_axis === 'date' ? formatDateDisplay(x) : x,
    }
    trend.series.forEach((s, i) => {
      const point = seriesPoints[i].find((p) => p.x === x)
      row[s.player.name] = point ? point.value : null
    })
    return row
  })

  const allSeries = trend.series.map((s, i) => ({
    name: s.player.name,
    color: COLORS[i % COLORS.length],
  }))
  const visibleSeries = allSeries.filter((s) => !hidden.has(s.name))

  function toggle(name: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const isPct = PCT_METRICS.has(trend.metric)

  return (
    <Stack gap="xs">
      <Group gap="md">
        {allSeries.map((s) => (
          <UnstyledButton
            key={s.name}
            onClick={() => toggle(s.name)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: `var(--mantine-color-${s.color.replace('.', '-')})`,
                opacity: hidden.has(s.name) ? 0.3 : 1,
              }}
            />
            <Text
              size="xs"
              c={hidden.has(s.name) ? 'dimmed' : undefined}
              td={hidden.has(s.name) ? 'line-through' : undefined}
            >
              {s.name}
            </Text>
          </UnstyledButton>
        ))}
      </Group>
      <LineChart
        h={280}
        data={data}
        dataKey="x"
        series={visibleSeries}
        curveType="monotone"
        connectNulls
        withLegend={false}
        withDots={data.length <= 30}
        valueFormatter={(v) => (isPct ? `${(v * 100).toFixed(1)}%` : v.toFixed(2))}
        xAxisLabel={trend.x_axis === 'games_played' ? 'Games played' : 'Date'}
      />
    </Stack>
  )
}
