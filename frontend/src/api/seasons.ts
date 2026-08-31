import { api } from '../lib/apiClient'
import type { Season } from './types'

export function listSeasons() {
  return api.get<Season[]>('/seasons')
}

export function createSeason(name: string, icon?: string) {
  return api.post<Season>('/seasons', { name, icon })
}

export function updateSeason(id: number, data: { name?: string; icon?: string }) {
  return api.patch<Season>(`/seasons/${id}`, data)
}
