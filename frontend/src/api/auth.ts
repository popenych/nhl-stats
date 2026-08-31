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

export function changePassword(currentPassword: string, newPassword: string) {
  return api.post<{ status: string }>('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
