import { useParams } from 'react-router-dom'
import { Paper, Stack, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as statsApi from '../../api/stats'
import * as teamsApi from '../../api/teams'
import { GamesMiniTable } from '../../components/GamesMiniTable'
import { StatsSummaryGrid } from '../../components/StatsSummaryGrid'
import { TrendChart } from '../../components/TrendChart'

export function TeamPage() {
  const { id } = useParams()
  const teamId = Number(id)

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsApi.getTeam(teamId),
  })

  const { data: summary } = useQuery({
    queryKey: ['team-summary', teamId],
    queryFn: () => statsApi.getTeamSummary(teamId),
  })

  const { data: trend } = useQuery({
    queryKey: ['team-trend', teamId],
    queryFn: () => statsApi.getTrend({ metric: 'win_pct', x: 'date', teamId }),
  })

  if (!team) return null

  return (
    <Stack>
      <Title order={2}>
        {team.abbreviation} — {team.name}
      </Title>

      {summary && (
        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            Stats (as this team)
          </Title>
          <StatsSummaryGrid summary={summary} />
        </Paper>
      )}

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Win % trend, per player
        </Title>
        <TrendChart trend={trend} />
      </Paper>

      <GamesMiniTable filters={{ team_id: teamId }} />
    </Stack>
  )
}
