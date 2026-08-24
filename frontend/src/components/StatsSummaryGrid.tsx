import type { ReactNode } from 'react'
import { Paper, SimpleGrid, Text } from '@mantine/core'

import type { StatsSummary } from '../api/types'
import { Last5 } from './Last5'
import { formatRecord } from '../lib/record'

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Text size="lg" fw={700} component="div">
        {value}
      </Text>
    </Paper>
  )
}

export function StatsSummaryGrid({ summary }: { summary: StatsSummary }) {
  if (summary.games_played === 0) {
    return (
      <Text c="dimmed" size="sm">
        No games yet.
      </Text>
    )
  }

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
      <Stat label="Record" value={formatRecord(summary.wins, summary.losses, summary.ties)} />
      <Stat label="W%" value={pct(summary.win_pct)} />
      <Stat label="GF/GP" value={summary.goals_for_per_game.toFixed(2)} />
      <Stat label="GA/GP" value={summary.goals_against_per_game.toFixed(2)} />
      <Stat label="SH%" value={pct(summary.shooting_pct)} />
      <Stat label="PP%" value={pct(summary.pp_pct)} />
      <Stat label="PK%" value={pct(summary.pk_pct)} />
      <Stat label="FOW%" value={pct(summary.faceoff_pct)} />
      <Stat label="Streak" value={summary.current_streak || '—'} />
      <Stat label="Last 5" value={summary.last5 ? <Last5 value={summary.last5} /> : '—'} />
      <Stat label="Shots/GP" value={summary.shots_per_game.toFixed(1)} />
      <Stat label="Hits/GP" value={summary.hits_per_game.toFixed(1)} />
    </SimpleGrid>
  )
}
