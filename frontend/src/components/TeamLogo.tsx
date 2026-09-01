import { Avatar } from '@mantine/core'

import type { Team } from '../api/types'
import { photoUrl } from '../lib/photo'
import { LOGO_BACKGROUND, LOGO_BORDER, LOGO_PADDING_RATIO } from '../lib/teamLogoConfig'

export function TeamLogo({ team, size = 24 }: { team: Team; size?: number }) {
  return (
    <Avatar
      src={team.logo_path ? photoUrl(team.logo_path) : null}
      alt={team.abbreviation}
      size={size}
      radius="sm"
      // Mantine's own Avatar.css only wires its --avatar-bd border variable
      // onto the placeholder (no-image) element, not the root box — so a
      // border set via `styles.root` silently never renders once a logo
      // image is present. A plain inline `style` on the root DOM node
      // sidesteps that entirely (always wins, not dependent on Mantine's
      // internal selector wiring).
      style={{ border: LOGO_BORDER, backgroundColor: LOGO_BACKGROUND }}
      styles={{
        image: { padding: Math.round(size * LOGO_PADDING_RATIO), objectFit: 'contain' },
        placeholder: {
          backgroundColor: LOGO_BACKGROUND,
          color: LOGO_BACKGROUND ? 'black' : undefined,
        },
      }}
    >
      {team.abbreviation.slice(0, 2)}
    </Avatar>
  )
}
