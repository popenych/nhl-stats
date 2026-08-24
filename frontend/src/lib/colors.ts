// "Atom" (One Dark/One Light) palette accents — softer than Mantine's default
// green/red, used consistently for win/loss indicators (badges, last-5 letters).
export const ATOM_GREEN = '#98c379'
export const ATOM_RED = '#e06c75'
export const ATOM_GRAY = '#7f848e'

export function outcomeColor(outcome: 'win' | 'loss' | 'tie' | null): string | undefined {
  if (outcome === 'win') return ATOM_GREEN
  if (outcome === 'loss') return ATOM_RED
  if (outcome === 'tie') return ATOM_GRAY
  return undefined
}

// ~15% opacity tint of a hex color, for badge backgrounds.
export function tint(hex: string) {
  return `${hex}26`
}
