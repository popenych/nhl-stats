import { useState } from 'react'
import { Button, Group, Paper, Table, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as seasonsApi from '../../api/seasons'
import type { Season } from '../../api/types'
import { useAuth } from '../../auth/auth-context-value'

function SeasonRow({ season }: { season: Season }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [icon, setIcon] = useState(season.icon ?? '')

  const updateMutation = useMutation({
    mutationFn: (newIcon: string) => seasonsApi.updateSeason(season.id, { icon: newIcon }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      notifications.show({ message: 'Season updated', color: 'green' })
      setEditing(false)
    },
    onError: () => notifications.show({ message: 'Failed to update season', color: 'red' }),
  })

  if (editing) {
    return (
      <Table.Tr>
        <Table.Td colSpan={2}>
          <Group gap="xs">
            <TextInput
              value={icon}
              onChange={(e) => setIcon(e.currentTarget.value)}
              placeholder="Icon"
              w={70}
            />
            <Text>{season.name}</Text>
            <Button
              size="xs"
              onClick={() => updateMutation.mutate(icon)}
              loading={updateMutation.isPending}
            >
              Save
            </Button>
            <Button size="xs" variant="subtle" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Group>
        </Table.Td>
      </Table.Tr>
    )
  }

  return (
    <Table.Tr>
      <Table.Td>
        {season.icon ? `${season.icon} ` : ''}
        {season.name}
      </Table.Td>
      <Table.Td>
        {user?.role === 'admin' && (
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              setIcon(season.icon ?? '')
              setEditing(true)
            }}
          >
            Edit icon
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  )
}

export function SeasonsIndex() {
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })

  return (
    <>
      <Title order={2} mb="md">
        Seasons
      </Title>
      <Paper withBorder p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {seasons?.map((s) => (
              <SeasonRow key={s.id} season={s} />
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  )
}
