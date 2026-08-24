import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core'

interface Option {
  value: string
  label: string
}

export function CreatableSelect({
  label,
  data,
  value,
  onChange,
  onCreate,
  createLabel,
  icon,
}: {
  label: string
  data: Option[]
  value: string | null
  onChange: (value: string | null) => void
  onCreate: (name: string) => Promise<{ id: number }>
  createLabel: string
  icon?: ReactNode
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await onCreate(newName.trim())
      onChange(String(created.id))
      setModalOpen(false)
      setNewName('')
    } catch {
      setError('Failed to create — name might already be in use.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Group align="flex-end" gap="xs">
        <Select
          label={label}
          data={data}
          value={value}
          onChange={onChange}
          searchable
          required
          leftSection={icon}
          style={{ flex: 1 }}
        />
        <Button variant="light" onClick={() => setModalOpen(true)} aria-label={createLabel}>
          + New
        </Button>
      </Group>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={createLabel}>
        <Stack>
          <TextInput
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            error={error}
            data-autofocus
          />
          <Button onClick={handleCreate} loading={creating}>
            Create
          </Button>
        </Stack>
      </Modal>
    </>
  )
}
