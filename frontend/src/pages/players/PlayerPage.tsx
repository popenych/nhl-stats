import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Group, Stack, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as playersApi from '../../api/players'
import { useAuth } from '../../auth/auth-context-value'
import { GamesMiniTable } from '../../components/GamesMiniTable'

export function PlayerPage() {
  const { id } = useParams()
  const playerId = Number(id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  const { data: player } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => playersApi.getPlayer(playerId),
  })

  const updateMutation = useMutation({
    mutationFn: (newName: string) => playersApi.updatePlayer(playerId, { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player', playerId] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      notifications.show({ message: 'Player updated', color: 'green' })
      setEditing(false)
    },
    onError: () => notifications.show({ message: 'Failed to update player', color: 'red' }),
  })

  if (!player) return null

  const canEdit = user?.role === 'admin' || user?.player.id === playerId

  return (
    <Stack>
      <Group justify="space-between">
        {editing ? (
          <Group>
            <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <Button onClick={() => updateMutation.mutate(name)} loading={updateMutation.isPending}>
              Save
            </Button>
            <Button variant="subtle" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Group>
        ) : (
          <Title order={2}>{player.name}</Title>
        )}
        {canEdit && !editing && (
          <Button
            variant="light"
            onClick={() => {
              setName(player.name)
              setEditing(true)
            }}
          >
            Edit
          </Button>
        )}
      </Group>
      <GamesMiniTable filters={{ player_id: playerId }} />
    </Stack>
  )
}
