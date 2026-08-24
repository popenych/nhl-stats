import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import * as authApi from '../api/auth'
import { ApiError } from '../lib/apiClient'
import { AuthContext } from './auth-context-value'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // Distinguishes "never checked yet" (loading) from "checked, not logged in"
  // (settled `me` query returning null) — the initial /auth/me check on load.
  const [checkedOnce, setCheckedOnce] = useState(false)

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      } finally {
        setCheckedOnce(true)
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  async function login(username: string, password: string) {
    const loggedInUser = await authApi.login(username, password)
    queryClient.setQueryData(['me'], loggedInUser)
  }

  async function logout() {
    await authApi.logout()
    queryClient.setQueryData(['me'], null)
  }

  return (
    <AuthContext
      value={{ user: user ?? null, isLoading: isLoading && !checkedOnce, login, logout }}
    >
      {children}
    </AuthContext>
  )
}
