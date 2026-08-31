import { Button, Modal, PasswordInput, Stack } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'

import * as authApi from '../api/auth'

interface ChangePasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function ChangePasswordModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const form = useForm<ChangePasswordValues>({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validate: {
      currentPassword: (v) => (v ? null : 'Required'),
      newPassword: (v) => (v.length >= 8 ? null : 'At least 8 characters'),
      confirmPassword: (v, values) => (v === values.newPassword ? null : 'Passwords must match'),
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      authApi.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      notifications.show({ message: 'Password updated', color: 'green' })
      form.reset()
      onClose()
    },
    onError: () => notifications.show({ message: 'Current password is incorrect', color: 'red' }),
  })

  return (
    <Modal
      opened={opened}
      onClose={() => {
        form.reset()
        onClose()
      }}
      title="Change password"
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <PasswordInput
            label="Current password"
            required
            {...form.getInputProps('currentPassword')}
          />
          <PasswordInput label="New password" required {...form.getInputProps('newPassword')} />
          <PasswordInput
            label="Confirm new password"
            required
            {...form.getInputProps('confirmPassword')}
          />
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}
