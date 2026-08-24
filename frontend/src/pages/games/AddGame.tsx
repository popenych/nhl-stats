import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as gamesApi from '../../api/games'
import { GameForm } from './GameForm'

export function AddGame() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: gamesApi.createGame,
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      notifications.show({ message: 'Game saved', color: 'green' })
      navigate(`/games/${game.id}`)
    },
    onError: () => notifications.show({ message: 'Failed to save game', color: 'red' }),
  })

  return (
    <GameForm
      title="Add a game"
      onSubmit={(data) => createMutation.mutate(data)}
      submitting={createMutation.isPending}
    />
  )
}
