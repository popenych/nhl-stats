import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Group, Modal, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as placesApi from '../../api/places'
import type { Place } from '../../api/types'
import { useAuth } from '../../auth/auth-context-value'

function PlaceRow({ place }: { place: Place }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(place.name)
  const [icon, setIcon] = useState(place.icon ?? '')

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; icon: string }) =>
      placesApi.updatePlace(place.id, { name: data.name, icon: data.icon }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] })
      notifications.show({ message: 'Place updated', color: 'green' })
      setEditing(false)
    },
    onError: () => notifications.show({ message: 'Failed to update place', color: 'red' }),
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
            <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <Button
              size="xs"
              onClick={() => updateMutation.mutate({ name, icon })}
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
    <Table.Tr onClick={() => navigate(`/places/${place.id}`)} style={{ cursor: 'pointer' }}>
      <Table.Td>
        {place.icon ? `${place.icon} ` : ''}
        {place.name}
      </Table.Td>
      <Table.Td>
        {user?.role === 'admin' && (
          <Button
            size="xs"
            variant="light"
            onClick={(e) => {
              e.stopPropagation()
              setName(place.name)
              setIcon(place.icon ?? '')
              setEditing(true)
            }}
          >
            Edit
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  )
}

function NewPlaceModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')

  const createMutation = useMutation({
    mutationFn: () => placesApi.createPlace(name, icon || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] })
      notifications.show({ message: 'Place created', color: 'green' })
      setName('')
      setIcon('')
      onClose()
    },
    onError: () => notifications.show({ message: 'Failed to create place', color: 'red' }),
  })

  return (
    <Modal opened={opened} onClose={onClose} title="New place">
      <Stack>
        <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <TextInput
          label="Icon"
          placeholder="e.g. an emoji"
          value={icon}
          onChange={(e) => setIcon(e.currentTarget.value)}
        />
        <Button
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={!name.trim()}
        >
          Create
        </Button>
      </Stack>
    </Modal>
  )
}

export function PlacesIndex() {
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })
  const [modalOpened, setModalOpened] = useState(false)

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Places</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
          New place
        </Button>
      </Group>
      <Paper withBorder p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {places?.map((p) => (
              <PlaceRow key={p.id} place={p} />
            ))}
          </Table.Tbody>
        </Table>
        {places?.length === 0 && (
          <Text c="dimmed" size="sm" mt="sm">
            No places yet.
          </Text>
        )}
      </Paper>
      <NewPlaceModal opened={modalOpened} onClose={() => setModalOpened(false)} />
    </>
  )
}
