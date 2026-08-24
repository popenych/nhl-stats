import { Text, Title } from '@mantine/core'

import { useAuth } from '../auth/auth-context-value'

export function Home() {
  const { user } = useAuth()

  return (
    <>
      <Title order={2}>Welcome, {user?.player.name}</Title>
      <Text c="dimmed" mt="xs">
        Season tables, recent games, and trend charts land in Phase 2/4.
      </Text>
    </>
  )
}
