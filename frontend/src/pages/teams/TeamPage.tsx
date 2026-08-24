import { useParams } from 'react-router-dom'
import { Stack, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as teamsApi from '../../api/teams'
import { GamesMiniTable } from '../../components/GamesMiniTable'

export function TeamPage() {
  const { id } = useParams()
  const teamId = Number(id)

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsApi.getTeam(teamId),
  })

  if (!team) return null

  return (
    <Stack>
      <Title order={2}>
        {team.abbreviation} — {team.name}
      </Title>
      <GamesMiniTable filters={{ team_id: teamId }} />
    </Stack>
  )
}
