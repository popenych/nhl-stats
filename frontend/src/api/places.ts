import { api } from '../lib/apiClient'
import type { Place } from './types'

export function listPlaces() {
  return api.get<Place[]>('/places')
}

export function createPlace(name: string, icon?: string) {
  return api.post<Place>('/places', { name, icon })
}

export function updatePlace(id: number, data: { name?: string; icon?: string }) {
  return api.patch<Place>(`/places/${id}`, data)
}
