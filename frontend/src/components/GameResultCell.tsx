import { Badge, Group, Text } from '@mantine/core'

import type { GameListItem } from '../api/types'
import { outcomeColor, tint } from '../lib/colors'
import type { Outcome } from '../lib/gameOutcome'
import { TeamLogo } from './TeamLogo'

// Away on the left, home on the right, everywhere a game is shown — matches
// the stats photo layout and the Add/Edit Game form.
export function GameResultCell({ game, outcome }: { game: GameListItem; outcome?: Outcome }) {
  const color = outcome ? outcomeColor(outcome) : undefined
  const badgeStyle = color
    ? { backgroundColor: tint(color), color, flexShrink: 0 }
    : { flexShrink: 0 }

  return (
    <Group gap={8} wrap="nowrap">
      <Text ta="right" style={{ flex: 1, minWidth: 0 }} truncate="end">
        {game.away.player.name}
      </Text>
      <TeamLogo team={game.away.team} size={20} />
      <Badge variant="light" color={color ? undefined : 'gray'} size="lg" style={badgeStyle}>
        {game.away.goals} - {game.home.goals}
      </Badge>
      <TeamLogo team={game.home.team} size={20} />
      <Text ta="left" style={{ flex: 1, minWidth: 0 }} truncate="end">
        {game.home.player.name}
      </Text>
    </Group>
  )
}
