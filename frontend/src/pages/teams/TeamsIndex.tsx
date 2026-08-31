import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Group, Modal, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as teamsApi from '../../api/teams'
import type { Team } from '../../api/types'
import { useAuth } from '../../auth/auth-context-value'
import { TeamLogo } from '../../components/TeamLogo'

function TeamRow({ team }: { team: Team }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [abbreviation, setAbbreviation] = useState(team.abbreviation)
  const [name, setName] = useState(team.name)

  const updateMutation = useMutation({
    mutationFn: (data: { abbreviation: string; name: string }) =>
      teamsApi.updateTeam(team.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      notifications.show({ message: 'Team updated', color: 'green' })
      setEditing(false)
    },
    onError: () => notifications.show({ message: 'Failed to update team', color: 'red' }),
  })

  if (editing) {
    return (
      <Table.Tr>
        <Table.Td colSpan={2}>
          <Group gap="xs">
            <TextInput
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.currentTarget.value.toUpperCase())}
              placeholder="ABC"
              w={80}
            />
            <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <Button
              size="xs"
              onClick={() => updateMutation.mutate({ abbreviation, name })}
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
    <Table.Tr onClick={() => navigate(`/teams/${team.id}`)} style={{ cursor: 'pointer' }}>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <TeamLogo team={team} size={24} />
          {team.abbreviation}
        </Group>
      </Table.Td>
      <Table.Td>{team.name}</Table.Td>
      <Table.Td>
        {user?.role === 'admin' && (
          <Button
            size="xs"
            variant="light"
            onClick={(e) => {
              e.stopPropagation()
              setAbbreviation(team.abbreviation)
              setName(team.name)
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

function NewTeamModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [abbreviation, setAbbreviation] = useState('')
  const [name, setName] = useState('')

  const createMutation = useMutation({
    mutationFn: () => teamsApi.createTeam(abbreviation, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      notifications.show({ message: 'Team created', color: 'green' })
      setAbbreviation('')
      setName('')
      onClose()
    },
    onError: () =>
      notifications.show({
        message: 'Failed to create team (duplicate abbreviation?)',
        color: 'red',
      }),
  })

  return (
    <Modal opened={opened} onClose={onClose} title="New team">
      <Stack>
        <TextInput
          label="Abbreviation"
          placeholder="e.g. TBL"
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.currentTarget.value.toUpperCase())}
        />
        <TextInput
          label="Name"
          placeholder="e.g. Tampa Bay Lightning"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Button
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={!abbreviation.trim() || !name.trim()}
        >
          Create
        </Button>
      </Stack>
    </Modal>
  )
}

export function TeamsIndex() {
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })
  const [search, setSearch] = useState('')
  const [modalOpened, setModalOpened] = useState(false)

  const filtered = (teams ?? []).filter((t) =>
    `${t.name} ${t.abbreviation}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Teams</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
          New team
        </Button>
      </Group>
      <TextInput
        placeholder="Search teams"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="md"
      />
      <Paper withBorder p="md">
        <Table.ScrollContainer minWidth={360}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Team</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((t) => (
                <TeamRow key={t.id} team={t} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {filtered.length === 0 && (
          <Text c="dimmed" size="sm" mt="sm">
            No teams found.
          </Text>
        )}
      </Paper>
      <NewTeamModal opened={modalOpened} onClose={() => setModalOpened(false)} />
    </>
  )
}
