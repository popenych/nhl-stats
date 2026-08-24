import { createContext, use } from 'react'
import type { User } from '../api/types'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
