import { api } from '../lib/apiClient'
import type { Place } from './types'

export function listPlaces() {
  return api.get<Place[]>('/places')
}

export function createPlace(name: string) {
  return api.post<Place>('/places', { name })
}
