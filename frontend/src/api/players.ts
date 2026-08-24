import { api } from '../lib/apiClient'
import type { Player } from './types'

export function listPlayers() {
  return api.get<Player[]>('/players')
}

export function getPlayer(id: number) {
  return api.get<Player>(`/players/${id}`)
}

export function updatePlayer(id: number, data: { name?: string; icon?: string }) {
  return api.patch<Player>(`/players/${id}`, data)
}
