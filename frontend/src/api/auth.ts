import { api } from '../lib/apiClient'
import type { User } from './types'

export function login(username: string, password: string) {
  return api.post<User>('/auth/login', { username, password })
}

export function logout() {
  return api.post<{ status: string }>('/auth/logout')
}

export function me() {
  return api.get<User>('/auth/me')
}
