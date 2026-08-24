import type { ReactNode } from 'react'
import {
  Divider,
  Fieldset,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { UseFormReturnType } from '@mantine/form'
import {
  IconAlertTriangle,
  IconBolt,
  IconClock,
  IconDisc,
  IconFlag,
  IconPercentage,
  IconScoreboard,
  IconShieldCheck,
  IconShirtSport,
  IconStopwatch,
  IconTarget,
  IconUser,
} from '@tabler/icons-react'

import type { Player, Team } from '../../api/types'
import { TeamLogo } from '../../components/TeamLogo'
import type { GameFormValues } from './gameFormTypes'

const LOW_CONFIDENCE_THRESHOLD = 0.6

// Label sits on its own full-width row, with the away/home inputs in a row
// below it — a narrow phone screen doesn't have room for a three-column
// away|label|home layout without the label text colliding with the inputs.
function StatRow({
  icon,
  label,
  away,
  home,
}: {
  icon: ReactNode
  label: string
  away: ReactNode
  home: ReactNode
}) {
  return (
    <Stack gap={4}>
      <Group gap={4} justify="center">
        {icon}
        <Text size="sm" fw={500} c="dimmed">
          {label}
        </Text>
      </Group>
      <SimpleGrid cols={2} spacing="xs">
        {away}
        {home}
      </SimpleGrid>
    </Stack>
  )
}

function warnStyles(confidence: number | undefined) {
  if (confidence === undefined || confidence >= LOW_CONFIDENCE_THRESHOLD) return undefined
  return { input: { borderColor: 'var(--mantine-color-yellow-6)', borderWidth: 2 } }
}

export function GameStatsGrid({
  form,
  players,
  teams,
  confidence,
  teamHints,
}: {
  form: UseFormReturnType<GameFormValues>
  players: Player[]
  teams: Team[]
  confidence?: { home: Record<string, number>; away: Record<string, number> }
  teamHints?: { home: string | null; away: string | null }
}) {
  const playerOptions = players.map((p) => ({ value: String(p.id), label: p.name }))
  const teamOptions = teams.map((t) => ({
    value: String(t.id),
    label: `${t.abbreviation} — ${t.name}`,
  }))

  const awayConf = (key: string) => confidence?.away?.[key]
  const homeConf = (key: string) => confidence?.home?.[key]

  const awayTeam = teams.find((t) => String(t.id) === form.values.away.teamId)
  const homeTeam = teams.find((t) => String(t.id) === form.values.home.teamId)

  return (
    <Fieldset legend={<Title order={4}>Stats</Title>}>
      <Stack gap="sm">
        <SimpleGrid cols={2} spacing="xs">
          <Text size="xs" c="dimmed" fw={700} ta="center">
            AWAY
          </Text>
          <Text size="xs" c="dimmed" fw={700} ta="center">
            HOME
          </Text>
        </SimpleGrid>

        <StatRow
          icon={<IconUser size={14} />}
          label="Player"
          away={
            <Select
              data={playerOptions}
              required
              searchable
              {...form.getInputProps('away.playerId')}
            />
          }
          home={
            <Select
              data={playerOptions}
              required
              searchable
              {...form.getInputProps('home.playerId')}
            />
          }
        />

        <StatRow
          icon={<IconShirtSport size={14} />}
          label="Team"
          away={
            <Stack gap={2}>
              <Select
                data={teamOptions}
                required
                searchable
                leftSection={awayTeam ? <TeamLogo team={awayTeam} size={20} /> : undefined}
                {...form.getInputProps('away.teamId')}
              />
              {teamHints?.away && (
                <Text size="xs" c="yellow.7">
                  Detected "{teamHints.away}" — no match
                </Text>
              )}
            </Stack>
          }
          home={
            <Stack gap={2}>
              <Select
                data={teamOptions}
                required
                searchable
                leftSection={homeTeam ? <TeamLogo team={homeTeam} size={20} /> : undefined}
                {...form.getInputProps('home.teamId')}
              />
              {teamHints?.home && (
                <Text size="xs" c="yellow.7">
                  Detected "{teamHints.home}" — no match
                </Text>
              )}
            </Stack>
          }
        />

        <Divider />

        <StatRow
          icon={<IconScoreboard size={14} />}
          label="Goals"
          away={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(awayConf('goals')) }}
              {...form.getInputProps('away.goals')}
            />
          }
          home={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(homeConf('goals')) }}
              {...form.getInputProps('home.goals')}
            />
          }
        />

        <StatRow
          icon={<IconTarget size={14} />}
          label="Total shots"
          away={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(awayConf('shots')) }}
              {...form.getInputProps('away.shots')}
            />
          }
          home={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(homeConf('shots')) }}
              {...form.getInputProps('home.shots')}
            />
          }
        />

        <StatRow
          icon={<IconBolt size={14} />}
          label="Hits"
          away={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(awayConf('hits')) }}
              {...form.getInputProps('away.hits')}
            />
          }
          home={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(homeConf('hits')) }}
              {...form.getInputProps('home.hits')}
            />
          }
        />

        <StatRow
          icon={<IconStopwatch size={14} />}
          label="Time on attack"
          away={
            <TextInput
              placeholder="6:41"
              required
              styles={{ input: warnStyles(awayConf('timeOnAttack')) }}
              {...form.getInputProps('away.timeOnAttack')}
            />
          }
          home={
            <TextInput
              placeholder="6:41"
              required
              styles={{ input: warnStyles(homeConf('timeOnAttack')) }}
              {...form.getInputProps('home.timeOnAttack')}
            />
          }
        />

        <StatRow
          icon={<IconPercentage size={14} />}
          label="Passing"
          away={
            <NumberInput
              min={0}
              max={100}
              decimalScale={1}
              required
              styles={{ input: warnStyles(awayConf('passingPct')) }}
              {...form.getInputProps('away.passingPct')}
            />
          }
          home={
            <NumberInput
              min={0}
              max={100}
              decimalScale={1}
              required
              styles={{ input: warnStyles(homeConf('passingPct')) }}
              {...form.getInputProps('home.passingPct')}
            />
          }
        />

        <StatRow
          icon={<IconDisc size={14} />}
          label="Faceoffs won"
          away={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(awayConf('faceoffsWon')) }}
              {...form.getInputProps('away.faceoffsWon')}
            />
          }
          home={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(homeConf('faceoffsWon')) }}
              {...form.getInputProps('home.faceoffsWon')}
            />
          }
        />

        <StatRow
          icon={<IconAlertTriangle size={14} />}
          label="Penalty minutes"
          away={
            <TextInput
              placeholder="4:00"
              required
              styles={{ input: warnStyles(awayConf('penaltyMinutes')) }}
              {...form.getInputProps('away.penaltyMinutes')}
            />
          }
          home={
            <TextInput
              placeholder="4:00"
              required
              styles={{ input: warnStyles(homeConf('penaltyMinutes')) }}
              {...form.getInputProps('home.penaltyMinutes')}
            />
          }
        />

        <StatRow
          icon={<IconFlag size={14} />}
          label="Powerplays"
          away={
            <Group gap={4} wrap="nowrap">
              <NumberInput
                min={0}
                required
                flex={1}
                styles={{ input: warnStyles(awayConf('powerplayGoals')) }}
                {...form.getInputProps('away.powerplayGoals')}
              />
              <Text>/</Text>
              <NumberInput
                min={0}
                required
                flex={1}
                styles={{ input: warnStyles(awayConf('powerplayTotal')) }}
                {...form.getInputProps('away.powerplayTotal')}
              />
            </Group>
          }
          home={
            <Group gap={4} wrap="nowrap">
              <NumberInput
                min={0}
                required
                flex={1}
                styles={{ input: warnStyles(homeConf('powerplayGoals')) }}
                {...form.getInputProps('home.powerplayGoals')}
              />
              <Text>/</Text>
              <NumberInput
                min={0}
                required
                flex={1}
                styles={{ input: warnStyles(homeConf('powerplayTotal')) }}
                {...form.getInputProps('home.powerplayTotal')}
              />
            </Group>
          }
        />

        <StatRow
          icon={<IconClock size={14} />}
          label="Powerplay minutes"
          away={
            <TextInput
              placeholder="3:24"
              required
              styles={{ input: warnStyles(awayConf('powerplayMinutes')) }}
              {...form.getInputProps('away.powerplayMinutes')}
            />
          }
          home={
            <TextInput
              placeholder="3:24"
              required
              styles={{ input: warnStyles(homeConf('powerplayMinutes')) }}
              {...form.getInputProps('home.powerplayMinutes')}
            />
          }
        />

        <StatRow
          icon={<IconShieldCheck size={14} />}
          label="Shorthanded goals"
          away={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(awayConf('shorthandedGoals')) }}
              {...form.getInputProps('away.shorthandedGoals')}
            />
          }
          home={
            <NumberInput
              min={0}
              required
              styles={{ input: warnStyles(homeConf('shorthandedGoals')) }}
              {...form.getInputProps('home.shorthandedGoals')}
            />
          }
        />
      </Stack>
    </Fieldset>
  )
}
