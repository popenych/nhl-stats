import type { ReactNode } from 'react'
import { Group, Stack, Table, Text } from '@mantine/core'
import {
  IconAlertTriangle,
  IconClock,
  IconDisc,
  IconFlag,
  IconPercentage,
  IconShieldCheck,
  IconStopwatch,
  IconTarget,
  IconTrophy,
  IconX,
} from '@tabler/icons-react'

import type { HeadToHead, StatsSummary } from '../api/types'
import { formatMMSS } from '../lib/time'

function RowLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Group gap={4} justify="center" wrap="nowrap">
      {icon}
      <Text size="sm" c="dimmed">
        {text}
      </Text>
    </Group>
  )
}

const ROWS: {
  label: string
  icon: ReactNode
  format: (s: StatsSummary) => string
}[] = [
  { label: 'Wins', icon: <IconTrophy size={14} />, format: (s) => String(s.wins) },
  { label: 'Losses', icon: <IconX size={14} />, format: (s) => String(s.losses) },
  {
    label: 'W%',
    icon: <IconPercentage size={14} />,
    format: (s) => `${(s.win_pct * 100).toFixed(1)}%`,
  },
  { label: 'Total shots', icon: <IconTarget size={14} />, format: (s) => String(s.shots_for) },
  { label: 'GF', icon: <IconTarget size={14} />, format: (s) => String(s.goals_for) },
  {
    label: 'SH%',
    icon: <IconPercentage size={14} />,
    format: (s) => `${(s.shooting_pct * 100).toFixed(1)}%`,
  },
  { label: 'GA', icon: <IconTarget size={14} />, format: (s) => String(s.goals_against) },
  {
    label: 'GF/GP',
    icon: <IconTarget size={14} />,
    format: (s) => s.goals_for_per_game.toFixed(2),
  },
  {
    label: 'GA/GP',
    icon: <IconTarget size={14} />,
    format: (s) => s.goals_against_per_game.toFixed(2),
  },
  {
    label: 'Time on attack avg',
    icon: <IconStopwatch size={14} />,
    format: (s) => formatMMSS(Math.round(s.time_on_attack_avg_seconds)),
  },
  {
    label: 'Passing %',
    icon: <IconPercentage size={14} />,
    format: (s) => `${s.passing_pct_avg.toFixed(1)}%`,
  },
  { label: 'Faceoffs won', icon: <IconDisc size={14} />, format: (s) => String(s.faceoffs_won) },
  {
    label: 'FOW%',
    icon: <IconDisc size={14} />,
    format: (s) => `${(s.faceoff_pct * 100).toFixed(1)}%`,
  },
  {
    label: 'PP minutes avg',
    icon: <IconClock size={14} />,
    format: (s) => formatMMSS(Math.round(s.powerplay_minutes_avg_seconds)),
  },
  {
    label: 'PP',
    icon: <IconFlag size={14} />,
    format: (s) => `${s.powerplay_goals}/${s.powerplay_total}`,
  },
  {
    label: 'PP%',
    icon: <IconFlag size={14} />,
    format: (s) => `${(s.pp_pct * 100).toFixed(1)}%`,
  },
  {
    label: 'PK%',
    icon: <IconAlertTriangle size={14} />,
    format: (s) => `${(s.pk_pct * 100).toFixed(1)}%`,
  },
  {
    label: 'Shorthanded goals',
    icon: <IconShieldCheck size={14} />,
    format: (s) => String(s.shorthanded_goals),
  },
]

export function HeadToHeadTable({ h2h }: { h2h: HeadToHead }) {
  return (
    <div>
      <Group justify="center" gap="md" wrap="nowrap" mb="md">
        <Stack align="center" gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="sm" ta="center">
            {h2h.player_a.name}
          </Text>
        </Stack>
        <Text size="xl" fw={900} c="dimmed">
          {h2h.player_a_wins}-{h2h.player_b_wins}-{h2h.ties}
        </Text>
        <Stack align="center" gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="sm" ta="center">
            {h2h.player_b.name}
          </Text>
        </Stack>
      </Group>

      <Table.ScrollContainer minWidth={300}>
        <Table>
          <Table.Tbody>
            {ROWS.map((row) => (
              <Table.Tr key={row.label}>
                <Table.Td>{row.format(h2h.player_a_summary)}</Table.Td>
                <Table.Td>
                  <RowLabel icon={row.icon} text={row.label} />
                </Table.Td>
                <Table.Td ta="right">{row.format(h2h.player_b_summary)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </div>
  )
}
