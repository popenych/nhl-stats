import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Group, Paper, Table, TextInput, Title } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'

import * as teamsApi from '../../api/teams'
import { TeamLogo } from '../../components/TeamLogo'

export function TeamsIndex() {
  const navigate = useNavigate()
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })
  const [search, setSearch] = useState('')

  const filtered = (teams ?? []).filter((t) =>
    `${t.name} ${t.abbreviation}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <>
      <Title order={2} mb="md">
        Teams
      </Title>
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
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((t) => (
                <Table.Tr
                  key={t.id}
                  onClick={() => navigate(`/teams/${t.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <TeamLogo team={t} size={24} />
                      {t.abbreviation}
                    </Group>
                  </Table.Td>
                  <Table.Td>{t.name}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </>
  )
}
