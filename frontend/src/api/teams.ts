import { api } from '../lib/apiClient'
import { postPhoto } from '../lib/photo'
import type { Team } from './types'

export function listTeams() {
  return api.get<Team[]>('/teams')
}

export function getTeam(id: number) {
  return api.get<Team>(`/teams/${id}`)
}

export function uploadTeamLogo(id: number, file: File) {
  return postPhoto<Team>(`/teams/${id}/logo`, file)
}
