import { Avatar } from '@mantine/core'

import type { Team } from '../api/types'
import { photoUrl } from '../lib/photo'

export function TeamLogo({ team, size = 24 }: { team: Team; size?: number }) {
  return (
    <Avatar
      src={team.logo_path ? photoUrl(team.logo_path) : null}
      alt={team.abbreviation}
      size={size}
      radius="sm"
    >
      {team.abbreviation.slice(0, 2)}
    </Avatar>
  )
}
