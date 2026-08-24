import { useParams } from 'react-router-dom'
import { Button, FileButton, Group, Paper, Stack, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPhoto } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as statsApi from '../../api/stats'
import * as teamsApi from '../../api/teams'
import { useAuth } from '../../auth/auth-context-value'
import { GamesMiniTable } from '../../components/GamesMiniTable'
import { StatsSummaryGrid } from '../../components/StatsSummaryGrid'
import { TeamLogo } from '../../components/TeamLogo'
import { TrendChart } from '../../components/TrendChart'

export function TeamPage() {
  const { id } = useParams()
  const teamId = Number(id)
  const { user } = useAuth()
  const queryClient = useQueryClient()

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

  const logoMutation = useMutation({
    mutationFn: (file: File) => teamsApi.uploadTeamLogo(teamId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      notifications.show({ message: 'Logo updated', color: 'green' })
    },
    onError: () => notifications.show({ message: 'Failed to upload logo', color: 'red' }),
  })

  if (!team) return null

  return (
    <Stack>
      <Group justify="space-between">
        <Group>
          <TeamLogo team={team} size={40} />
          <Title order={2}>
            {team.abbreviation} — {team.name}
          </Title>
        </Group>
        {user?.role === 'admin' && (
          <FileButton onChange={(f) => f && logoMutation.mutate(f)} accept="image/*">
            {(props) => (
              <Button
                variant="light"
                leftSection={<IconPhoto size={16} />}
                loading={logoMutation.isPending}
                {...props}
              >
                {team.logo_path ? 'Change logo' : 'Add logo'}
              </Button>
            )}
          </FileButton>
        )}
      </Group>

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

      <GamesMiniTable filters={{ team_id: teamId }} highlightTeamId={teamId} />
    </Stack>
  )
}
