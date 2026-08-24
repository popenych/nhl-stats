import { useNavigate } from 'react-router-dom'
import { Paper, Table, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as playersApi from '../../api/players'

export function PlayersIndex() {
  const navigate = useNavigate()
  const { data: players } = useQuery({ queryKey: ['players'], queryFn: playersApi.listPlayers })

  return (
    <>
      <Title order={2} mb="md">
        Players
      </Title>
      <Paper withBorder p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {players?.map((p) => (
              <Table.Tr
                key={p.id}
                onClick={() => navigate(`/players/${p.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>{p.name}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  )
}
