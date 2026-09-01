import { useState } from 'react'
import {
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  PasswordInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconDatabaseExport, IconUserPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as backupApi from '../../api/backup'
import * as usersApi from '../../api/users'
import { ApiError } from '../../lib/apiClient'
import type { UserRole } from '../../api/types'

export function AdminUsers() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.listUsers,
  })

  const backupMutation = useMutation({
    mutationFn: backupApi.triggerBackup,
    onSuccess: () =>
      notifications.show({
        message: 'Backup requested — it runs within about 30 seconds',
        color: 'green',
      }),
    onError: () => notifications.show({ message: 'Failed to request backup', color: 'red' }),
  })

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      playerName: '',
      role: 'member' as UserRole,
    },
    validate: {
      username: (v) => (v.trim() ? null : 'Required'),
      password: (v) => (v.length >= 8 ? null : 'At least 8 characters'),
      playerName: (v) => (v.trim() ? null : 'Required'),
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      usersApi.createUser({
        username: values.username,
        password: values.password,
        role: values.role,
        player: { name: values.playerName },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      notifications.show({ message: 'User created', color: 'green' })
      form.reset()
      setModalOpen(false)
    },
    onError: (err) => {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'Failed to create user',
        color: 'red',
      })
    },
  })

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Users</Title>
        <Button onClick={() => setModalOpen(true)} leftSection={<IconUserPlus size={16} />}>
          Add friend
        </Button>
      </Group>

      <Paper withBorder p="md">
        <Table.ScrollContainer minWidth={420}>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Username</Table.Th>
                <Table.Th>Player</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Active</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users?.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>{u.username}</Table.Td>
                  <Table.Td>{u.player.name}</Table.Td>
                  <Table.Td>{u.role}</Table.Td>
                  <Table.Td>{u.is_active ? 'Yes' : 'No'}</Table.Td>
                </Table.Tr>
              ))}
              {!isLoading && users?.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>No users yet.</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Paper withBorder p="md" mt="md">
        <Group justify="space-between">
          <div>
            <Title order={4}>Backups</Title>
            <Text size="sm" c="dimmed">
              Runs daily automatically. Trigger one manually if you want an up-to-date snapshot
              right now (e.g. before a risky change).
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconDatabaseExport size={16} />}
            onClick={() => backupMutation.mutate()}
            loading={backupMutation.isPending}
          >
            Run backup now
          </Button>
        </Group>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Add a friend">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label="Username" required {...form.getInputProps('username')} />
            <PasswordInput label="Password" required {...form.getInputProps('password')} />
            <TextInput label="Player name" required {...form.getInputProps('playerName')} />
            <Select
              label="Role"
              data={[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Admin' },
              ]}
              {...form.getInputProps('role')}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
