import { api } from '../lib/apiClient'
import type { Season } from './types'

export function listSeasons() {
  return api.get<Season[]>('/seasons')
}

export function createSeason(name: string) {
  return api.post<Season>('/seasons', { name })
}
