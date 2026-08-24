import { api } from '../lib/apiClient'
import type { Team } from './types'

export function listTeams() {
  return api.get<Team[]>('/teams')
}

export function getTeam(id: number) {
  return api.get<Team>(`/teams/${id}`)
}
