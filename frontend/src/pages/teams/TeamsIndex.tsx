import { useNavigate } from 'react-router-dom'
import { Paper, Table, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as teamsApi from '../../api/teams'

export function TeamsIndex() {
  const navigate = useNavigate()
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: teamsApi.listTeams })

  return (
    <>
      <Title order={2} mb="md">
        Teams
      </Title>
      <Paper withBorder p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Abbreviation</Table.Th>
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
                <Table.Td>{t.abbreviation}</Table.Td>
                <Table.Td>{t.name}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  )
}
