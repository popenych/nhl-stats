import { useNavigate } from 'react-router-dom'
import { Paper, Table, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import * as placesApi from '../../api/places'

export function PlacesIndex() {
  const navigate = useNavigate()
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.listPlaces })

  return (
    <>
      <Title order={2} mb="md">
        Places
      </Title>
      <Paper withBorder p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {places?.map((p) => (
              <Table.Tr
                key={p.id}
                onClick={() => navigate(`/places/${p.id}`)}
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
