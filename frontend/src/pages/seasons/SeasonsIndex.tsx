import { useState } from 'react'
import { Button, Group, Modal, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as seasonsApi from '../../api/seasons'
import type { Season } from '../../api/types'
import { useAuth } from '../../auth/auth-context-value'

function SeasonRow({ season }: { season: Season }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(season.name)
  const [icon, setIcon] = useState(season.icon ?? '')

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; icon: string }) =>
      seasonsApi.updateSeason(season.id, { name: data.name, icon: data.icon }),
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
              setName(season.name)
              setIcon(season.icon ?? '')
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

function NewSeasonModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')

  const createMutation = useMutation({
    mutationFn: () => seasonsApi.createSeason(name, icon || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      notifications.show({ message: 'Season created', color: 'green' })
      setName('')
      setIcon('')
      onClose()
    },
    onError: () => notifications.show({ message: 'Failed to create season', color: 'red' }),
  })

  return (
    <Modal opened={opened} onClose={onClose} title="New season">
      <Stack>
        <TextInput
          label="Name"
          placeholder="e.g. NHL 27"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
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

export function SeasonsIndex() {
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: seasonsApi.listSeasons })
  const [modalOpened, setModalOpened] = useState(false)

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Seasons</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
          New season
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
            {seasons?.map((s) => (
              <SeasonRow key={s.id} season={s} />
            ))}
          </Table.Tbody>
        </Table>
        {seasons?.length === 0 && (
          <Text c="dimmed" size="sm" mt="sm">
            No seasons yet.
          </Text>
        )}
      </Paper>
      <NewSeasonModal opened={modalOpened} onClose={() => setModalOpened(false)} />
    </>
  )
}
