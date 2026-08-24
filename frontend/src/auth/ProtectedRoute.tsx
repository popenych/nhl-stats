import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'

import { useAuth } from './auth-context-value'

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode
  adminOnly?: boolean
}) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
