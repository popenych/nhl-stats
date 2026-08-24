import { useNavigate, useParams } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as gamesApi from '../../api/games'
import { GameForm } from './GameForm'

export function EditGame() {
  const { id } = useParams()
  const gameId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => gamesApi.getGame(gameId),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof gamesApi.updateGame>[1]) =>
      gamesApi.updateGame(gameId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
      notifications.show({ message: 'Game updated', color: 'green' })
      navigate(`/games/${updated.id}`)
    },
    onError: () => notifications.show({ message: 'Failed to update game', color: 'red' }),
  })

  if (isLoading || !game) {
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    )
  }

  return (
    <GameForm
      title="Edit game"
      initialGame={game}
      onSubmit={(data) => updateMutation.mutate(data)}
      submitting={updateMutation.isPending}
    />
  )
}
