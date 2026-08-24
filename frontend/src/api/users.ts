import { api } from '../lib/apiClient'
import type { User, UserRole } from './types'

export interface UserCreateInput {
  username: string
  password: string
  role: UserRole
  email?: string
  player: { name: string; icon?: string }
}

export function listUsers() {
  return api.get<User[]>('/users')
}

export function createUser(input: UserCreateInput) {
  return api.post<User>('/users', input)
}
