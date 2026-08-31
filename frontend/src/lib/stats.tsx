import type { ReactNode } from 'react'
import {
  IconAlertTriangle,
  IconBolt,
  IconCalendarEvent,
  IconClock,
  IconDisc,
  IconFlag,
  IconPercentage,
  IconPlusMinus,
  IconShieldCheck,
  IconStopwatch,
  IconTarget,
  IconTrophy,
  IconX,
} from '@tabler/icons-react'

import type { MetricKey, SideFilter, StatsSummary } from '../api/types'
import { formatMMSS } from './time'

// Home/Guest filter — whether a player/team was on the home or away side of
// the game. Shared across every filter bar that offers it.
export const SIDE_OPTIONS: { value: '' | SideFilter; label: string }[] = [
  { value: '', label: 'Home & Guest' },
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Guest' },
]

// Single source of truth for every stat shown anywhere in the app —
// leaderboard/all-time columns, the player/team stats list, head-to-head,
// and the 3-way team compare all render from this list rather than keeping
// their own copies, so a name/icon/order change here propagates everywhere.
// `short` is used in compact tables (leaderboard); `full` on player/team
// pages. `metricKey` is the backend StatsSummary field the trend/leaderboard
// endpoints key off of — several display entries (e.g. "PP", "GF-GA") share
// an underlying metricKey with a plainer entry, which is fine for sorting/
// trend but means METRIC_OPTIONS (below) dedupes by metricKey.
export interface StatField {
  key: string
  metricKey: MetricKey
  short: string
  full: string
  icon: ReactNode
  format: (s: StatsSummary) => string
  // Comparison direction for head-to-head / compare highlighting and for
  // sorting: true = bigger value() wins, false = smaller value() wins.
  higherIsBetter: boolean
  // Excluded from best/worst text-color highlighting in compare tables —
  // e.g. Games Played, where "more games" isn't a meaningful "better".
  noHighlight?: boolean
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

function fixed2(v: number) {
  return v.toFixed(2)
}

function mmss(v: number) {
  return formatMMSS(Math.round(v))
}

export const STAT_FIELDS: StatField[] = [
  {
    key: 'games_played',
    metricKey: 'games_played',
    short: 'GP',
    full: 'Games Played',
    icon: <IconCalendarEvent size={14} />,
    format: (s) => String(s.games_played),
    higherIsBetter: true,
    noHighlight: true,
  },
  {
    key: 'wins',
    metricKey: 'wins',
    short: 'W',
    full: 'Wins',
    icon: <IconTrophy size={14} />,
    format: (s) => String(s.wins),
    higherIsBetter: true,
  },
  {
    key: 'losses',
    metricKey: 'losses',
    short: 'L',
    full: 'Losses',
    icon: <IconX size={14} />,
    format: (s) => String(s.losses),
    higherIsBetter: false,
  },
  {
    key: 'win_pct',
    metricKey: 'win_pct',
    short: 'W%',
    full: 'Win %',
    icon: <IconPercentage size={14} />,
    format: (s) => pct(s.win_pct),
    higherIsBetter: true,
  },
  {
    key: 'gf_ga_total',
    metricKey: 'goal_diff',
    short: 'GF-GA',
    full: 'Goals For-Against',
    icon: <IconTarget size={14} />,
    format: (s) => `${s.goals_for}-${s.goals_against}`,
    higherIsBetter: true,
  },
  {
    key: 'goal_diff',
    metricKey: 'goal_diff',
    short: 'GD',
    full: 'Goals Diff',
    icon: <IconPlusMinus size={14} />,
    format: (s) => (s.goal_diff > 0 ? `+${s.goal_diff}` : String(s.goal_diff)),
    higherIsBetter: true,
  },
  {
    key: 'shots_for',
    metricKey: 'shots_for',
    short: 'SH',
    full: 'Total Shots',
    icon: <IconTarget size={14} />,
    format: (s) => String(s.shots_for),
    higherIsBetter: true,
  },
  {
    key: 'goals_for',
    metricKey: 'goals_for',
    short: 'GF',
    full: 'Goals For',
    icon: <IconTarget size={14} />,
    format: (s) => String(s.goals_for),
    higherIsBetter: true,
  },
  {
    key: 'shooting_pct',
    metricKey: 'shooting_pct',
    short: 'SH%',
    full: 'Shooting %',
    icon: <IconPercentage size={14} />,
    format: (s) => pct(s.shooting_pct),
    higherIsBetter: true,
  },
  {
    key: 'goals_against',
    metricKey: 'goals_against',
    short: 'GA',
    full: 'Goals Against',
    icon: <IconTarget size={14} />,
    format: (s) => String(s.goals_against),
    higherIsBetter: false,
  },
  {
    key: 'shots_per_game',
    metricKey: 'shots_per_game',
    short: 'SH/GP',
    full: 'Shots per Game',
    icon: <IconTarget size={14} />,
    format: (s) => fixed2(s.shots_per_game),
    higherIsBetter: true,
  },
  {
    key: 'gf_ga_per_game',
    metricKey: 'goal_diff_per_game',
    short: 'GF-GA/GP',
    full: 'Goals For-Against per Game',
    icon: <IconTarget size={14} />,
    format: (s) => `${fixed2(s.goals_for_per_game)}-${fixed2(s.goals_against_per_game)}`,
    higherIsBetter: true,
  },
  {
    key: 'goals_for_per_game',
    metricKey: 'goals_for_per_game',
    short: 'GF/GP',
    full: 'Goals For per Game',
    icon: <IconTarget size={14} />,
    format: (s) => fixed2(s.goals_for_per_game),
    higherIsBetter: true,
  },
  {
    key: 'goals_against_per_game',
    metricKey: 'goals_against_per_game',
    short: 'GA/GP',
    full: 'Goals Against per Game',
    icon: <IconTarget size={14} />,
    format: (s) => fixed2(s.goals_against_per_game),
    higherIsBetter: false,
  },
  {
    key: 'hits_for',
    metricKey: 'hits_for',
    short: 'H',
    full: 'Total Hits',
    icon: <IconBolt size={14} />,
    format: (s) => String(s.hits_for),
    higherIsBetter: true,
  },
  {
    key: 'hits_per_game',
    metricKey: 'hits_per_game',
    short: 'H/GP',
    full: 'Hits per Game',
    icon: <IconBolt size={14} />,
    format: (s) => fixed2(s.hits_per_game),
    higherIsBetter: true,
  },
  {
    key: 'time_on_attack_avg_seconds',
    metricKey: 'time_on_attack_avg_seconds',
    short: 'TOA avg',
    full: 'Time on Attack (avg)',
    icon: <IconStopwatch size={14} />,
    format: (s) => mmss(s.time_on_attack_avg_seconds),
    higherIsBetter: true,
  },
  {
    key: 'passing_pct_avg',
    metricKey: 'passing_pct_avg',
    short: 'P%',
    full: 'Passing %',
    icon: <IconPercentage size={14} />,
    format: (s) => `${s.passing_pct_avg.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: 'faceoffs_won',
    metricKey: 'faceoffs_won',
    short: 'FOW',
    full: 'Faceoffs Won',
    icon: <IconDisc size={14} />,
    format: (s) => String(s.faceoffs_won),
    higherIsBetter: true,
  },
  {
    key: 'faceoff_pct',
    metricKey: 'faceoff_pct',
    short: 'FOW%',
    full: 'Faceoff %',
    icon: <IconDisc size={14} />,
    format: (s) => pct(s.faceoff_pct),
    higherIsBetter: true,
  },
  {
    key: 'powerplay_minutes_avg_seconds',
    metricKey: 'powerplay_minutes_avg_seconds',
    short: 'PP min avg',
    full: 'Power Play Minutes (avg)',
    icon: <IconClock size={14} />,
    format: (s) => mmss(s.powerplay_minutes_avg_seconds),
    higherIsBetter: true,
  },
  {
    key: 'pp',
    metricKey: 'powerplay_total',
    short: 'PP',
    full: 'Power Play (Goals/Chances)',
    icon: <IconFlag size={14} />,
    format: (s) => `${s.powerplay_goals}/${s.powerplay_total}`,
    higherIsBetter: true,
  },
  {
    key: 'pp_pct',
    metricKey: 'pp_pct',
    short: 'PP%',
    full: 'Power Play %',
    icon: <IconFlag size={14} />,
    format: (s) => pct(s.pp_pct),
    higherIsBetter: true,
  },
  {
    key: 'penalty_minutes_total_seconds',
    metricKey: 'penalty_minutes_total_seconds',
    short: 'PK min total',
    full: 'Penalty Kill Minutes (total)',
    icon: <IconAlertTriangle size={14} />,
    format: (s) => mmss(s.penalty_minutes_total_seconds),
    higherIsBetter: false,
  },
  {
    key: 'penalty_minutes_avg_seconds',
    metricKey: 'penalty_minutes_avg_seconds',
    short: 'PK min avg',
    full: 'Penalty Kill Minutes (avg)',
    icon: <IconAlertTriangle size={14} />,
    format: (s) => mmss(s.penalty_minutes_avg_seconds),
    higherIsBetter: false,
  },
  {
    key: 'pk',
    metricKey: 'penalty_kill_situations',
    short: 'PK',
    full: 'Penalty Kill (Kills/Situations)',
    icon: <IconAlertTriangle size={14} />,
    format: (s) => `${s.penalty_kills_successful}/${s.penalty_kill_situations}`,
    higherIsBetter: false,
  },
  {
    key: 'pk_pct',
    metricKey: 'pk_pct',
    short: 'PK%',
    full: 'Penalty Kill %',
    icon: <IconAlertTriangle size={14} />,
    format: (s) => pct(s.pk_pct),
    higherIsBetter: true,
  },
  {
    key: 'shorthanded_goals',
    metricKey: 'shorthanded_goals',
    short: 'SHG',
    full: 'Shorthanded Goals',
    icon: <IconShieldCheck size={14} />,
    format: (s) => String(s.shorthanded_goals),
    higherIsBetter: true,
  },
]

export function statByKey(key: string): StatField {
  const field = STAT_FIELDS.find((f) => f.key === key)
  if (!field) throw new Error(`Unknown stat field "${key}"`)
  return field
}

export function statValue(field: StatField, s: StatsSummary): number {
  return s[field.metricKey] as number
}

// Options for a metric/trend selector — every stat is eligible (item 10),
// deduped by metricKey since a few display entries (GD/GF-GA, PP, PK) share
// an underlying field with another entry and would otherwise offer the same
// trend line twice under different labels.
export const METRIC_OPTIONS: { value: MetricKey; label: string }[] = (() => {
  const seen = new Set<MetricKey>()
  const options: { value: MetricKey; label: string }[] = []
  for (const field of STAT_FIELDS) {
    if (seen.has(field.metricKey)) continue
    seen.add(field.metricKey)
    options.push({ value: field.metricKey, label: field.full })
  }
  return options
})()

// Every stat except the ones with their own dedicated leading column (GP,
// W%, Record covers Wins/Losses) — the leaderboard/all-time tables' column
// set, also reused for the player's per-team breakdown table (item 9),
// which is shaped the same way just keyed by team instead of by player.
// gf_ga_per_game is also dropped here — GF/GP and GA/GP already cover the
// same numbers as separate columns, so the combined one was redundant.
export const LEADERBOARD_COLUMNS: StatField[] = STAT_FIELDS.filter(
  (f) => !['games_played', 'wins', 'losses', 'win_pct', 'gf_ga_per_game'].includes(f.key),
)

// Sort-by options for any table built from LEADERBOARD_COLUMNS — every
// stat, deduped by underlying metricKey (GD and GF-GA share one, so only
// the first — GD — appears; same value either way).
export const SORT_FIELDS: { value: string; label: string; extract: (s: StatsSummary) => number }[] =
  (() => {
    const seen = new Set<string>()
    const fields: { value: string; label: string; extract: (s: StatsSummary) => number }[] = []
    for (const f of STAT_FIELDS) {
      if (seen.has(f.metricKey)) continue
      seen.add(f.metricKey)
      fields.push({ value: f.metricKey, label: f.short, extract: (s) => statValue(f, s) })
    }
    return fields
  })()

export function sortByField<T extends { summary: StatsSummary }>(rows: T[], sortBy: string): T[] {
  const field = SORT_FIELDS.find((f) => f.value === sortBy) ?? SORT_FIELDS[0]
  return [...rows].sort((a, b) => field.extract(b.summary) - field.extract(a.summary))
}

// Row set + order for the player/team compare tables (item-3/4 of the
// "merge stats + head-to-head" round): unlike the leaderboard, GP/W/L/W%
// get their own rows here (no separate Record/GP columns in this table
// shape), the combined "X-Y" Goals For-Against composites are dropped
// (redundant with the separate GF/GA/GD rows below), and the goals cluster
// follows an explicit requested order rather than STAT_FIELDS' leaderboard-
// tuned order.
const COMPARE_TABLE_KEYS = [
  'games_played',
  'wins',
  'losses',
  'win_pct',
  'shots_for',
  'goals_for',
  'goals_against',
  'goal_diff',
  'shooting_pct',
  'shots_per_game',
  'goals_for_per_game',
  'goals_against_per_game',
  'hits_for',
  'hits_per_game',
  'time_on_attack_avg_seconds',
  'passing_pct_avg',
  'faceoffs_won',
  'faceoff_pct',
  'powerplay_minutes_avg_seconds',
  'pp',
  'pp_pct',
  'penalty_minutes_total_seconds',
  'penalty_minutes_avg_seconds',
  'pk',
  'pk_pct',
  'shorthanded_goals',
]
export const COMPARE_TABLE_ROWS: StatField[] = COMPARE_TABLE_KEYS.map(statByKey)

// Text-color highlighting for a compare table (head-to-head, team compare):
// among the given column indices, the best value(s) for this stat are
// green, everything strictly worse is red — ties are all colored green
// (tied-for-best is still best), undefined/missing columns get no color.
// A summary with zero games played is also excluded from comparison — it's
// a placeholder for "no data" (every field defaults to 0), not a real
// achievement, so it must not win a "lower is better" row like Goals Against.
export function highlightColors(
  field: StatField,
  summaries: (StatsSummary | undefined)[],
  indices: number[],
): Map<number, 'green' | 'red'> {
  if (field.noHighlight) return new Map()
  const defined = indices
    .map((i) => ({
      i,
      v:
        summaries[i] && summaries[i]!.games_played > 0
          ? statValue(field, summaries[i] as StatsSummary)
          : undefined,
    }))
    .filter((e): e is { i: number; v: number } => e.v !== undefined)
  const result = new Map<number, 'green' | 'red'>()
  if (defined.length < 2) return result
  const values = defined.map((e) => e.v)
  const best = field.higherIsBetter ? Math.max(...values) : Math.min(...values)
  for (const { i, v } of defined) {
    result.set(i, v === best ? 'green' : 'red')
  }
  return result
}
