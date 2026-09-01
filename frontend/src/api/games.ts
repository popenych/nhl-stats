import { api } from '../lib/apiClient'
import { photoUrl, postPhoto } from '../lib/photo'
import type {
  ExtractResponse,
  Game,
  GameCreateInput,
  GameListResponse,
  GameUpdateInput,
  SideFilter,
} from './types'

export interface GameFilters {
  player_id?: number
  team_id?: number
  opponent_team_id?: number
  season_id?: number
  place_id?: number
  date_from?: string
  date_to?: string
  side?: SideFilter
  sort?: 'date_desc' | 'date_asc'
  page?: number
  page_size?: number
}

export function listGames(filters: GameFilters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return api.get<GameListResponse>(`/games${qs ? `?${qs}` : ''}`)
}

export function getGame(id: number) {
  return api.get<Game>(`/games/${id}`)
}

export function createGame(data: GameCreateInput) {
  return api.post<Game>('/games', data)
}

export function updateGame(id: number, data: GameUpdateInput) {
  return api.patch<Game>(`/games/${id}`, data)
}

export function deleteGame(id: number) {
  return api.delete<void>(`/games/${id}`)
}

/** Saves the photo and, separately, uploads-only (no OCR) — used when
 * re-extraction isn't wanted (e.g. edit flow keeping the same photo). */
export function uploadGamePhoto(file: File): Promise<{ photo_path: string }> {
  return postPhoto('/games/photo', file)
}

/** Saves the photo AND runs OCR against it in one call — this is what
 * powers the Add Game flow's auto-fill. Can take a few seconds (label
 * detection + recognition over the whole photo). */
export function extractGamePhoto(file: File): Promise<ExtractResponse> {
  return postPhoto('/games/extract', file)
}

export { photoUrl }
