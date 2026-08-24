import { useNavigate } from 'react-router-dom'
import { Group, Paper, Table, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as teamsApi from '../../api/teams'
import { TeamLogo } from '../../components/TeamLogo'

export function TeamsIndex() {
  const navigate = useNavigate()
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })

  return (
    <>
      <Title order={2} mb="md">
        Teams
      </Title>
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
              {teams?.map((t) => (
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
