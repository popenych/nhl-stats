import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Container, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'

import { useAuth } from '../auth/auth-context-value'
import { ApiError } from '../lib/apiClient'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    initialValues: { username: '', password: '' },
  })

  async function handleSubmit(values: typeof form.values) {
    setError(null)
    setSubmitting(true)
    try {
      await login(values.username, values.password)
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container size="xs" py="xl">
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <Title order={2} mb="md">
          Log in
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Username" required {...form.getInputProps('username')} />
            <PasswordInput label="Password" required {...form.getInputProps('password')} />
            {error && <Paper c="red">{error}</Paper>}
            <Button type="submit" loading={submitting}>
              Log in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
