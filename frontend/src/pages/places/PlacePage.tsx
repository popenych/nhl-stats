import { useParams } from 'react-router-dom'
import { Stack, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as placesApi from '../../api/places'
import { GamesMiniTable } from '../../components/GamesMiniTable'

export function PlacePage() {
  const { id } = useParams()
  const placeId = Number(id)

  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })
  const place = places?.find((p) => p.id === placeId)

  if (!place) return null

  return (
    <Stack>
      <Title order={2}>{place.name}</Title>
      <GamesMiniTable filters={{ place_id: placeId }} />
    </Stack>
  )
}
