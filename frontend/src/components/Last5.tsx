import { Group, Text } from '@mantine/core'

import { ATOM_GRAY, ATOM_GREEN, ATOM_RED } from '../lib/colors'

function letterColor(letter: string) {
  if (letter === 'W') return ATOM_GREEN
  if (letter === 'L') return ATOM_RED
  return ATOM_GRAY
}

export function Last5({ value }: { value: string }) {
  if (!value) return null
  return (
    <Group gap={2} wrap="nowrap">
      {value.split('').map((letter, i) => (
        <Text key={i} fw={700} size="sm" style={{ color: letterColor(letter) }}>
          {letter}
        </Text>
      ))}
    </Group>
  )
}
